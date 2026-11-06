import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { createBillingRoutes, type BillingLimits } from './billing';

const TOKEN = 't'.repeat(40);
const silent = { info() {}, warn() {}, error() {} };

const directory = {
  snapshot: async () => ({
    version: 1,
    spaces: [{ id: 'spc_a', members: [{ sub: 's1', email: 'boss@a.fr', role: 'owner' }, { sub: 's2', email: 'm@a.fr', role: 'member' }] }],
  }),
};

const db = {
  planVersion: { findMany: async () => [] },
  planPrice: { findFirst: async () => null },
} as unknown as PrismaClient;

const stripeCalls: string[] = [];
const getStripe = async () =>
  ({
    client: {
      checkout: { sessions: { create: async () => void stripeCalls.push('checkout') } },
      billingPortal: { sessions: { create: async () => void stripeCalls.push('portal') } },
    },
  }) as never;

function app(token: string | undefined, limits?: Partial<BillingLimits>) {
  return createBillingRoutes({
    db,
    env: { BILLING_API_TOKEN: token, BILLING_REDIRECT_ORIGINS: 'https://sso.facile.studio' },
    directory,
    getStripe,
    logger: silent,
    limits,
  });
}

const checkout = {
  space_id: 'spc_a',
  space_name: 'A',
  owner_email: 'boss@a.fr',
  lookup_key: 'plan_pro_month',
  success_url: 'https://sso.facile.studio/spaces/spc_a',
  cancel_url: 'https://sso.facile.studio/spaces/spc_a',
};

const post = (path: string, body: unknown, auth = `Bearer ${TOKEN}`) =>
  new Request(`http://api.test${path}`, {
    method: 'POST',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('billing routes', () => {
  it('serves the catalog without auth', async () => {
    const res = await app(undefined).request('/api/catalog');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ plans: [] });
  });

  it('refuses a missing or wrong token', async () => {
    expect((await app(TOKEN).request('/billing/spaces/spc_a')).status).toBe(401);
    expect((await app(TOKEN).request(post('/billing/checkout', checkout, `Bearer ${'x'.repeat(40)}`))).status).toBe(401);
    expect((await app(TOKEN).request(post('/billing/checkout', checkout, TOKEN))).status).toBe(401);
  });

  it('disables the billing routes when the token is missing or shorter than 32 characters', async () => {
    for (const token of [undefined, '', 'short-token-under-32-characters']) {
      const res = await app(token).request(post('/billing/checkout', checkout, `Bearer ${token ?? ''}`));
      expect(res.status).toBe(404);
    }
  });

  it('rejects an oversized body, declared or streamed', async () => {
    const big = JSON.stringify({ ...checkout, space_name: 'x'.repeat(20_000) });
    const declared = post('/billing/checkout', big);
    declared.headers.set('content-length', String(big.length));
    expect((await app(TOKEN).request(declared)).status).toBe(413);
    expect((await app(TOKEN).request(post('/billing/checkout', big))).status).toBe(413);
  });

  it('rejects malformed bodies, unknown fields and client-sent prices', async () => {
    expect((await app(TOKEN).request(post('/billing/checkout', '{nope'))).status).toBe(400);
    expect((await app(TOKEN).request(post('/billing/checkout', { ...checkout, price: 'price_x' }))).status).toBe(400);
    expect((await app(TOKEN).request(post('/billing/checkout', { ...checkout, lookup_key: 'price_123' }))).status).toBe(400);
  });

  it('rejects redirects off the allowlist, over http or with credentials', async () => {
    for (const url of ['https://evil.example/x', 'http://sso.facile.studio/x', 'https://user:pw@sso.facile.studio/x', '/spaces', 'javascript:alert(1)']) {
      const res = await app(TOKEN).request(post('/billing/checkout', { ...checkout, success_url: url }));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('invalid_redirect');
    }
    const portal = await app(TOKEN).request(post('/billing/portal', { space_id: 'spc_a', owner_email: 'boss@a.fr', return_url: 'https://evil.example' }));
    expect(portal.status).toBe(400);
  });

  it('refuses a non-owner and an unknown space before Stripe', async () => {
    const member = await app(TOKEN).request(post('/billing/checkout', { ...checkout, owner_email: 'm@a.fr' }));
    expect(member.status).toBe(403);
    const unknown = await app(TOKEN).request(post('/billing/checkout', { ...checkout, space_id: 'spc_z' }));
    expect(unknown.status).toBe(404);
    expect(stripeCalls).toEqual([]);
  });

  it('refuses a tampered or draft lookup key', async () => {
    const res = await app(TOKEN).request(post('/billing/checkout', { ...checkout, lookup_key: 'plan_studio_month' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('unknown_price');
    expect(stripeCalls).toEqual([]);
  });

  it('rate limits per token after auth, not per IP, with a higher ceiling', async () => {
    const limited = app(TOKEN, { catalog: 1, token: 3, space: 100 });
    const authed = { headers: { authorization: `Bearer ${TOKEN}`, 'x-forwarded-for': '10.0.0.1' } };
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await limited.request('/billing/spaces/spc_a', authed)).status);
    expect(statuses.slice(0, 3)).not.toContain(429);
    expect(statuses[3]).toBe(429);
    await limited.request('/api/catalog');
    expect((await limited.request('/api/catalog')).status).toBe(429);
  });

  it('rate limits checkout and portal per space', async () => {
    const limited = app(TOKEN, { space: 2 });
    const member = { ...checkout, owner_email: 'm@a.fr' };
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await limited.request(post('/billing/checkout', member))).status);
    expect(codes).toEqual([403, 403, 429]);
    const other = await limited.request(post('/billing/checkout', { ...member, space_id: 'spc_z' }));
    expect(other.status).toBe(404);
  });

  it('locks an IP out after repeated wrong tokens, but never blocks the valid token', async () => {
    const limited = app(TOKEN, { failures: 2 });
    const wrong = `Bearer ${'x'.repeat(40)}`;
    expect((await limited.request(post('/billing/portal', {}, wrong))).status).toBe(401);
    expect((await limited.request(post('/billing/portal', {}, wrong))).status).toBe(401);
    expect((await limited.request(post('/billing/portal', {}, wrong))).status).toBe(429);
    const valid = await limited.request(post('/billing/portal', { space_id: 'spc_a', owner_email: 'm@a.fr', return_url: 'https://sso.facile.studio/x' }));
    expect(valid.status).toBe(403);
  });

  it('requires an owner for the portal', async () => {
    const base = { space_id: 'spc_a', return_url: 'https://sso.facile.studio/x' };
    expect((await app(TOKEN).request(post('/billing/portal', base))).status).toBe(400);
    const member = await app(TOKEN).request(post('/billing/portal', { ...base, owner_email: 'm@a.fr' }));
    expect(member.status).toBe(403);
    expect((await member.json()).error.code).toBe('not_owner');
    expect(stripeCalls).toEqual([]);
  });

  it('never echoes the token or internal errors', async () => {
    const broken = createBillingRoutes({
      db: { planVersion: { findMany: async () => { throw new Error(`boom ${TOKEN}`); } } } as never,
      env: { BILLING_API_TOKEN: TOKEN, BILLING_REDIRECT_ORIGINS: '' },
      directory,
      getStripe,
      logger: silent,
    });
    const res = await broken.request('/api/catalog');
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(TOKEN);
  });
});
