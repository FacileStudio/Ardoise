import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { PrismaClient } from '@repo/database';
import { GLOUTON_ROUTES_PREFIX, createGloutonRoutes } from './glouton';

const env = {
  GLOUTON_URL: 'https://glouton.test',
  GLOUTON_API_TOKEN: 'glouton-token',
  GLOUTON_WEBHOOK_SECRET: 's'.repeat(16),
};

type Row = {
  id: string;
  gloutonCompanyId: string | null;
  spaceId: string | null;
  updatedAt: Date;
  [key: string]: unknown;
};

const stored = (): Row => ({
  id: 'c1',
  gloutonCompanyId: 'g1',
  spaceId: null,
  companyName: 'Acme',
  contactFirstName: 'Ada',
  contactLastName: 'Lovelace',
  contactEmail: null,
  billingAddress: null,
  billingCity: null,
  billingPostalCode: null,
  billingCountry: null,
  siret: null,
  tvaIntracom: null,
  updatedAt: new Date('2026-11-03T12:00:00Z'),
});

type Where = { id?: string; gloutonCompanyId?: string };

function fakeDb(rows: Row[], spaces: Record<string, string> = {}) {
  const writes: { op: string; data: Record<string, unknown> }[] = [];
  const find = (where: Where) =>
    rows.find((row) =>
      where.id ? row.id === where.id : row.gloutonCompanyId === where.gloutonCompanyId
    ) ?? null;
  const withRelations = (row: Row | null) =>
    row && {
      ...row,
      space: row.spaceId ? { registreSpaceId: `r-${row.spaceId}` } : null,
      _count: { missions: 0, payments: 0 },
    };
  const db = {
    space: {
      findUnique: async ({ where }: { where: { registreSpaceId: string } }) =>
        spaces[where.registreSpaceId] ? { id: spaces[where.registreSpaceId] } : null,
    },
    client: {
      findUnique: async ({ where }: { where: Where }) => withRelations(find(where)),
      create: async ({ data }: { data: Row }) => {
        writes.push({ op: 'create', data });
        const row = { ...data, id: 'new' };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: { where: Where; data: Partial<Row> }) => {
        writes.push({ op: 'update', data });
        const row = find(where)!;
        Object.assign(row, data, data.updatedAt ? {} : { updatedAt: new Date() });
        return row;
      },
    },
  } as unknown as PrismaClient;
  return { db, writes };
}

function appFor(db: PrismaClient, config: Record<string, string> = env) {
  const app = new Hono();
  app.route(GLOUTON_ROUTES_PREFIX, createGloutonRoutes(config, db));
  return app;
}

const payload = (overrides: Record<string, unknown> = {}) => ({
  gloutonCompanyId: 'g1',
  registreSpaceId: null,
  companyName: 'Acme Renamed',
  contactFirstName: 'Ada',
  contactLastName: 'Lovelace',
  contactEmail: 'ada@acme.test',
  billingAddress: null,
  billingCity: 'Paris',
  billingPostalCode: null,
  billingCountry: null,
  siret: null,
  tvaIntracom: null,
  updatedAt: '2026-11-03T13:00:00Z',
  ...overrides,
});

const call = (
  app: Hono,
  method: string,
  path: string,
  body?: unknown,
  token = env.GLOUTON_API_TOKEN
) =>
  app.request(`${GLOUTON_ROUTES_PREFIX}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-sync-source': 'glouton',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const original = globalThis.fetch;
let outbound: string[] = [];

beforeEach(() => {
  outbound = [];
  globalThis.fetch = (async (url: string) => {
    outbound.push(String(url));
    return new Response(null, { status: 202 });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = original;
});

describe('glouton inbound auth', () => {
  test('refuses a wrong or missing token without touching the database', async () => {
    const { db, writes } = fakeDb([stored()]);
    const app = appFor(db);
    expect((await call(app, 'PUT', '/clients/c1', payload(), 'nope')).status).toBe(401);
    expect(
      (await app.request(`${GLOUTON_ROUTES_PREFIX}/clients/c1`, { method: 'GET' })).status
    ).toBe(401);
    expect(writes).toEqual([]);
  });

  test('is closed when Glouton is not configured', async () => {
    const { db } = fakeDb([stored()]);
    expect((await call(appFor(db, {}), 'GET', '/clients/c1')).status).toBe(404);
  });

  test('rejects an invalid payload', async () => {
    const { db, writes } = fakeDb([stored()]);
    const res = await call(appFor(db), 'PUT', '/clients/c1', payload({ updatedAt: 'yesterday' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_payload');
    expect(writes).toEqual([]);
  });
});

describe('glouton inbound writes', () => {
  test('skips a payload older than or equal to the stored client', async () => {
    const { db, writes } = fakeDb([stored()]);
    const res = await call(
      appFor(db),
      'PUT',
      '/clients/c1',
      payload({ updatedAt: '2026-11-03T12:00:00Z' })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: { id: 'c1', updatedAt: '2026-11-03T12:00:00.000Z', skipped: true },
    });
    expect(writes).toEqual([]);
  });

  test('applies a newer payload and keeps its updatedAt', async () => {
    const { db } = fakeDb([stored()]);
    const res = await call(appFor(db), 'PUT', '/clients/c1', payload());
    expect(await res.json()).toEqual({ data: { id: 'c1', updatedAt: '2026-11-03T13:00:00.000Z' } });
  });

  test('POST updates the linked client and creates an unknown one in its space', async () => {
    const { db, writes } = fakeDb([stored()], { 'r-team': 'space-1' });
    const app = appFor(db);
    await call(app, 'POST', '/clients', payload());
    await call(
      app,
      'POST',
      '/clients',
      payload({ gloutonCompanyId: 'g2', registreSpaceId: 'r-team' })
    );
    expect(writes.map((write) => write.op)).toEqual(['update', 'create']);
    expect(writes[1].data).toMatchObject({ gloutonCompanyId: 'g2', spaceId: 'space-1' });

    const unknown = await call(
      app,
      'POST',
      '/clients',
      payload({ gloutonCompanyId: 'g3', registreSpaceId: 'r-x' })
    );
    expect(unknown.status).toBe(422);

    const spaceless = await call(app, 'POST', '/clients', payload({ gloutonCompanyId: 'g4' }));
    expect(spaceless.status).toBe(422);
    expect((await spaceless.json()).error.code).toBe('space_required');
    expect(writes.map((write) => write.op)).toEqual(['update', 'create']);
  });

  test('unlink clears the link and GET returns the payload', async () => {
    const { db } = fakeDb([stored()]);
    const app = appFor(db);
    expect((await call(app, 'POST', '/clients/c1/unlink')).status).toBe(200);
    const res = await call(app, 'GET', '/clients/c1');
    expect((await res.json()).data).toMatchObject({ id: 'c1', gloutonCompanyId: null });
    expect((await call(app, 'GET', '/clients/missing')).status).toBe(404);
  });

  test('never echoes a Glouton write back to Glouton', async () => {
    const { db } = fakeDb([stored()]);
    const app = appFor(db);
    await call(app, 'PUT', '/clients/c1', payload());
    await call(app, 'POST', '/clients', payload({ gloutonCompanyId: 'g9' }));
    await call(app, 'POST', '/clients/c1/unlink');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(outbound).toEqual([]);
  });
});
