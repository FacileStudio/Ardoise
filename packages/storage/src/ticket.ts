import { createHmac, timingSafeEqual } from 'node:crypto';

export type StorageMethod = 'GET' | 'PUT';

export interface StorageTicketPayload {
  method: StorageMethod;
  key: string;
  expiresAt: number;
}

function signPayload(secret: string, payload: StorageTicketPayload): string {
  return createHmac('sha256', secret)
    .update(`${payload.method}:${payload.key}:${payload.expiresAt}`)
    .digest('base64url');
}

export function createStorageTicket(
  secret: string,
  payload: Omit<StorageTicketPayload, 'expiresAt'>,
  expiresInSeconds: number
): string {
  const ticketPayload = {
    ...payload,
    expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const signature = signPayload(secret, ticketPayload);
  return Buffer.from(JSON.stringify({ ...ticketPayload, signature })).toString('base64url');
}

export function verifyStorageTicket(
  secret: string,
  ticket: string | null | undefined,
  expected: Pick<StorageTicketPayload, 'method' | 'key'>
): boolean {
  if (!ticket) return false;

  try {
    const parsed = JSON.parse(Buffer.from(ticket, 'base64url').toString('utf8')) as StorageTicketPayload & {
      signature?: string;
    };

    if (parsed.method !== expected.method || parsed.key !== expected.key) return false;
    if (!parsed.expiresAt || parsed.expiresAt < Math.floor(Date.now() / 1000)) return false;
    if (!parsed.signature) return false;

    const expectedSignature = signPayload(secret, parsed);
    const actual = Buffer.from(parsed.signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (actual.length !== expectedBuffer.length) return false;

    return timingSafeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}
