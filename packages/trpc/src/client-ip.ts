import { BlockList, isIP } from 'node:net';

/**
 * The visitor address of a request that reached the API through Traefik, and
 * possibly Cloudflare in front of it. Ported from tronc's RealIP
 * (middleware/cloudflare.go).
 *
 * Each proxy appends the address it received the connection from to
 * `X-Forwarded-For`, so the chain is walked right to left and every hop that is
 * a private address or a Cloudflare edge is skipped. The first address that is
 * not trusted is the visitor. Entries to its left are whatever the caller
 * sent and are never read, so nobody can pick their own identity.
 *
 * `CF-Connecting-IP` is read only when the rightmost hop is a Cloudflare edge,
 * the one case where Cloudflare itself wrote the header. Anywhere else it is
 * attacker input and is ignored.
 *
 * Cloudflare ranges: https://www.cloudflare.com/ips-v4 and
 * https://www.cloudflare.com/ips-v6, snapshot of 2026-08-10. A range that
 * drifts out of date only degrades attribution for that edge.
 */
const CLOUDFLARE: Array<[string, number]> = [
  ['173.245.48.0', 20],
  ['103.21.244.0', 22],
  ['103.22.200.0', 22],
  ['103.31.4.0', 22],
  ['141.101.64.0', 18],
  ['108.162.192.0', 18],
  ['190.93.240.0', 20],
  ['188.114.96.0', 20],
  ['197.234.240.0', 22],
  ['198.41.128.0', 17],
  ['162.158.0.0', 15],
  ['104.16.0.0', 13],
  ['104.24.0.0', 14],
  ['172.64.0.0', 13],
  ['131.0.72.0', 22],
  ['2400:cb00::', 32],
  ['2606:4700::', 32],
  ['2803:f800::', 32],
  ['2405:b500::', 32],
  ['2405:8100::', 32],
  ['2a06:98c0::', 29],
  ['2c0f:f248::', 32],
];

const PRIVATE: Array<[string, number]> = [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['100.64.0.0', 10],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
];

const build = (ranges: Array<[string, number]>) => {
  const list = new BlockList();
  for (const [network, prefix] of ranges) {
    list.addSubnet(network, prefix, network.includes(':') ? 'ipv6' : 'ipv4');
  }
  return list;
};

const cloudflare = build(CLOUDFLARE);
const trusted = build([...CLOUDFLARE, ...PRIVATE]);

const family = (ip: string) => (isIP(ip) === 6 ? 'ipv6' : 'ipv4');
const inList = (list: BlockList, ip: string) => isIP(ip) !== 0 && list.check(ip, family(ip));

export function clientIp(
  forwardedFor: string | null | undefined,
  peer?: string,
  cfConnectingIp?: string | null
): string | undefined {
  const chain = (forwardedFor ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const rightmost = chain.at(-1) ?? peer;

  const cf = cfConnectingIp?.trim();
  if (cf && isIP(cf) !== 0 && rightmost && inList(cloudflare, rightmost)) return cf;

  for (let i = chain.length - 1; i >= 0; i -= 1) {
    if (!inList(trusted, chain[i]!)) return chain[i];
  }
  return chain[0] || peer || undefined;
}
