import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { request } from 'node:https';

export class UnsafeWebhookUrlError extends Error {}

const blocked = new BlockList();

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const BLOCKED_V6: Array<[string, number]> = [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
];

for (const [net, prefix] of BLOCKED_V4) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of BLOCKED_V6) blocked.addSubnet(net, prefix, 'ipv6');

const MAPPED_V4 = /^(?:0{0,4}:){0,5}ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

function normalise(address: string): string {
  const bare = address.replace(/^\[|\]$/g, '').split('%')[0] ?? '';
  const mapped = MAPPED_V4.exec(bare);
  return mapped?.[1] ?? bare;
}

/** Whether an IP literal is public: not private, loopback, link-local, reserved or multicast. */
export function isPublicAddress(address: string): boolean {
  const ip = normalise(address);
  const family = isIP(ip);
  if (family === 0) return false;
  if (family === 6 && /^::ffff:/i.test(ip)) return false;
  return !blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

export type Resolver = (hostname: string) => Promise<string[]>;

const resolveAll: Resolver = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address);

export type SafeTarget = { url: URL; address: string; family: 4 | 6 };

/**
 * Checks an outbound webhook URL and returns the one address to connect to.
 * https only, no credentials, and every address the name resolves to must be
 * public, so a name that also points inside the network is refused.
 */
export async function resolveSafeTarget(raw: string, resolver: Resolver = resolveAll): Promise<SafeTarget> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeWebhookUrlError('The webhook URL is not a valid URL');
  }
  if (url.protocol !== 'https:') throw new UnsafeWebhookUrlError('The webhook URL must use https');
  if (url.username || url.password) throw new UnsafeWebhookUrlError('The webhook URL must not hold credentials');

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await resolver(host);
    } catch {
      throw new UnsafeWebhookUrlError('The webhook host does not resolve');
    }
  }
  if (addresses.length === 0) throw new UnsafeWebhookUrlError('The webhook host does not resolve');
  if (!addresses.every(isPublicAddress)) {
    throw new UnsafeWebhookUrlError('The webhook host resolves to a private or reserved address');
  }

  const address = normalise(addresses[0]!);
  return { url, address, family: isIP(address) === 6 ? 6 : 4 };
}

export type Transport = (
  target: SafeTarget,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
) => Promise<number>;

/**
 * POSTs through the address that was just checked (the connection cannot be
 * redirected to another one by a second DNS answer), keeps TLS verification
 * against the original host name, never follows a redirect and reads no body.
 */
export const httpsTransport: Transport = (target, headers, body, timeoutMs) =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        protocol: 'https:',
        hostname: target.url.hostname.replace(/^\[|\]$/g, ''),
        servername: isIP(target.url.hostname.replace(/^\[|\]$/g, '')) ? undefined : target.url.hostname,
        port: target.url.port || 443,
        path: `${target.url.pathname}${target.url.search}`,
        method: 'POST',
        headers: { ...headers, 'content-length': String(Buffer.byteLength(body)) },
        lookup: (_host, options, callback) =>
          options.all
            ? callback(null, [{ address: target.address, family: target.family }] as never, undefined as never)
            : callback(null, target.address, target.family),
        timeout: timeoutMs,
      },
      (response) => {
        response.destroy();
        resolve(response.statusCode ?? 0);
      }
    );
    const timer = setTimeout(() => req.destroy(new Error('timeout')), timeoutMs);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    req.on('close', () => clearTimeout(timer));
    req.end(body);
  });

export const WEBHOOK_TIMEOUT_MS = 5_000;

/** Delivers one signed body to a space's own webhook; resolves with the HTTP status. 3xx counts as a failure for the caller. */
export async function postToSpaceWebhook(
  rawUrl: string,
  headers: Record<string, string>,
  body: string,
  deps: { resolver?: Resolver; transport?: Transport } = {}
): Promise<number> {
  const target = await resolveSafeTarget(rawUrl, deps.resolver);
  return (deps.transport ?? httpsTransport)(target, headers, body, WEBHOOK_TIMEOUT_MS);
}
