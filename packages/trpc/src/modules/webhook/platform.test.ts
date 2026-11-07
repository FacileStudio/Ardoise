import { afterEach, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import type { PrismaClient } from '@repo/database';
import { encryptSecret } from '../settings/service';
import { deliverConfiguredWebhook, dispatchConfiguredWebhook } from './service';

process.env.ENCRYPTION_SECRET ??= 'platform-webhook-test-secret-0123456789';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };

function run(webhookSecret: string) {
  const seen: Array<{ headers: Headers; body: string }> = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    seen.push({ headers: new Headers(init.headers), body: String(init.body) });
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  const db = {
    settings: {
      findUnique: async () => ({ id: 'global', webhookUrl: 'https://hook.example.test/in', webhookSecret, webhookEvents: [] }),
    },
  } as unknown as PrismaClient;
  return deliverConfiguredWebhook({ db, log: silent as never, spaceId: null, event: 'settings.updated', data: {} }).then(
    () => seen
  );
}

describe('platform webhook signature', () => {
  it('verifies with the plaintext secret when the stored secret is encrypted', async () => {
    const plaintext = 'platform-signing-secret';
    const [request] = await run(encryptSecret(plaintext));

    const expected = `sha256=${createHmac('sha256', plaintext).update(request!.body).digest('hex')}`;
    expect(request!.headers.get('x-ardoise-signature-256')).toBe(expected);
  });

  it('does not sign with the stored ciphertext', async () => {
    const stored = encryptSecret('platform-signing-secret');
    const [request] = await run(stored);

    const withCiphertext = `sha256=${createHmac('sha256', stored).update(request!.body).digest('hex')}`;
    expect(request!.headers.get('x-ardoise-signature-256')).not.toBe(withCiphertext);
  });

  it('still signs a legacy secret that was stored in plaintext', async () => {
    const [request] = await run('legacy-plain-secret');

    const expected = `sha256=${createHmac('sha256', 'legacy-plain-secret').update(request!.body).digest('hex')}`;
    expect(request!.headers.get('x-ardoise-signature-256')).toBe(expected);
  });
});

describe('dispatchConfiguredWebhook', () => {
  it('returns before a slow receiver answers and never throws', async () => {
    let release: () => void = () => {};
    globalThis.fetch = (() => new Promise<Response>((resolve) => (release = () => resolve(new Response('{}'))))) as unknown as typeof fetch;
    const db = {
      settings: { findUnique: async () => ({ id: 'global', webhookUrl: 'https://hook.example.test/in', webhookSecret: null, webhookEvents: [] }) },
    } as unknown as PrismaClient;

    const started = Date.now();
    await dispatchConfiguredWebhook({ db, log: silent as never, spaceId: null, event: 'x', data: {} });
    expect(Date.now() - started).toBeLessThan(200);
    release();

    const broken = { settings: { findUnique: async () => { throw new Error('db down'); } } } as unknown as PrismaClient;
    await dispatchConfiguredWebhook({ db: broken, log: silent as never, spaceId: null, event: 'x', data: {} });
  });
});
