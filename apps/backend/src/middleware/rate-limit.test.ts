import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { RateLimiter, bucketCosts, createTrpcRateLimit } from './rate-limit.middleware';

function app() {
  const server = new Hono();
  server.use('/trpc/*', createTrpcRateLimit(new RateLimiter()));
  server.all('/trpc/*', (c) => c.json({ ok: true }));
  return server;
}

const call = (server: Hono, path: string, ip = '203.0.113.7') =>
  server.request(path, { method: 'POST', headers: { 'x-forwarded-for': ip } });

describe('bucketCosts', () => {
  it('counts every procedure of a batch against its own bucket', () => {
    const costs = bucketCosts('/trpc/user.me,magicLink.request,magicLink.request,payment.list');

    expect(costs.get('auth')).toBe(2);
    expect(costs.get('payment')).toBe(1);
    expect(costs.get('general')).toBe(1);
  });
});

describe('magic link procedures', () => {
  it('share the strict bucket with the login attempt', () => {
    const costs = bucketCosts('/trpc/magicLink.request,magicLink.consume,magicLink.request');

    expect(costs.get('auth')).toBe(3);
    expect(costs.get('general')).toBeUndefined();
  });
});

describe('session procedures', () => {
  it('keep auth.me and auth.refresh out of the login bucket', () => {
    const costs = bucketCosts('/trpc/auth.me,auth.refresh,auth.logout');

    expect(costs.get('auth')).toBeUndefined();
    expect(costs.get('general')).toBe(3);
  });
});

describe('trpc rate limit', () => {
  it('lets a visitor navigate far past five session checks a minute', async () => {
    const server = app();
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) statuses.push((await call(server, '/trpc/auth.me')).status);

    expect(statuses.every((status) => status === 200)).toBe(true);
  });

  it('blocks the sixth login attempt', async () => {
    const server = app();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await call(server, '/trpc/magicLink.request')).status);

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('does not let a batch smuggle past the login limit', async () => {
    const server = app();
    const batch = Array(50).fill('magicLink.request').join(',');

    expect((await call(server, `/trpc/${batch}?batch=1`)).status).toBe(429);
  });

  it('does not let a varied path or a leading procedure dodge the login bucket', async () => {
    const server = app();
    for (let i = 0; i < 5; i++) await call(server, '/trpc/magicLink.request');

    expect((await call(server, '/trpc/user.me,magicLink.request?batch=1')).status).toBe(429);
    expect((await call(server, '/trpc/magicLink.request,auth.me')).status).toBe(429);
  });

  it('keeps other clients independent', async () => {
    const server = app();
    for (let i = 0; i < 6; i++) await call(server, '/trpc/magicLink.request');

    expect((await call(server, '/trpc/magicLink.request', '198.51.100.1')).status).toBe(200);
  });

  it('does not let a caller pick a fresh identity with a forged first address', async () => {
    const server = app();
    for (let i = 0; i < 5; i++) await call(server, '/trpc/magicLink.request', `10.0.0.${i}, 203.0.113.7`);

    expect((await call(server, '/trpc/magicLink.request', '10.9.9.9, 203.0.113.7')).status).toBe(429);
  });
});

describe('pay link procedures', () => {
  it('have their own bucket, and a batch cannot dodge it', () => {
    const costs = bucketCosts('/trpc/payLink.get,payLink.checkout,portal.checkout,payment.list');

    expect(costs.get('payLink')).toBe(2);
    expect(costs.get('payment')).toBe(2);
  });

  it('answers 429 after 15 calls from one address', async () => {
    const server = app();
    for (let i = 0; i < 15; i += 1) {
      expect((await call(server, '/trpc/payLink.get')).status).toBe(200);
    }
    expect((await call(server, '/trpc/payLink.get')).status).toBe(429);
    expect((await call(server, '/trpc/payLink.get', '198.51.100.9')).status).toBe(200);
  });
});
