import { afterEach, describe, expect, test } from 'bun:test';
import {
  DELIVERY_HEADER,
  EVENT_HEADER,
  SIGNATURE_HEADER,
  bearerMatches,
  companyUrl,
  deliver,
  emit,
  gloutonConfigFromEnv,
  signBody,
  toCents,
  toClientPayload,
  verifySignature,
} from './index';

const SECRET = 'a-long-enough-secret';
const config = { url: 'https://glouton.test', token: 'tok', webhookSecret: SECRET };
const silent = { info: () => {}, warn: () => {}, error: () => {} };
const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

type Call = { url: string; headers: Record<string, string>; body: string };

function stubFetch(statuses: number[]): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string>, body: String(init.body) });
    return new Response(null, { status: statuses[calls.length - 1] ?? 200 });
  }) as unknown as typeof fetch;
  return calls;
}

describe('signature', () => {
  const body = '{"event":"client.created"}';

  test('accepts the signature it produced', () => {
    expect(verifySignature(SECRET, body, signBody(SECRET, body))).toBe(true);
  });

  test('rejects missing, tampered, wrong-secret and truncated signatures', () => {
    const good = signBody(SECRET, body);
    expect(verifySignature(SECRET, body, undefined)).toBe(false);
    expect(verifySignature(SECRET, `${body} `, good)).toBe(false);
    expect(verifySignature('another-secret-value', body, good)).toBe(false);
    expect(verifySignature(SECRET, body, good.slice(0, -1))).toBe(false);
  });
});

describe('bearer', () => {
  test('matches only the exact token', () => {
    expect(bearerMatches('tok', 'Bearer tok')).toBe(true);
    expect(bearerMatches('tok', 'Bearer toke')).toBe(false);
    expect(bearerMatches('tok', 'tok')).toBe(false);
    expect(bearerMatches('tok', null)).toBe(false);
  });
});

describe('config', () => {
  test('is null unless all three are set and trims the trailing slash', () => {
    expect(gloutonConfigFromEnv({ GLOUTON_URL: 'https://g.test' })).toBeNull();
    const full = gloutonConfigFromEnv({
      GLOUTON_URL: 'https://g.test/',
      GLOUTON_API_TOKEN: 't',
      GLOUTON_WEBHOOK_SECRET: SECRET,
    });
    expect(full?.url).toBe('https://g.test');
    expect(companyUrl(full!, 'c 1')).toBe('https://g.test/app/contacts/companies/c%201');
  });
});

describe('payload', () => {
  test('maps the client and its space', () => {
    const payload = toClientPayload({
      id: 'cl1',
      gloutonCompanyId: null,
      companyName: 'Acme',
      contactFirstName: 'Ada',
      contactLastName: 'Lovelace',
      contactEmail: null,
      billingAddress: null,
      billingCity: 'Paris',
      billingPostalCode: null,
      billingCountry: 'France',
      siret: null,
      tvaIntracom: null,
      updatedAt: new Date('2026-11-03T10:00:00Z'),
      space: { registreSpaceId: 'sp_1' },
    });
    expect(payload.registreSpaceId).toBe('sp_1');
    expect(payload.updatedAt).toBe('2026-11-03T10:00:00.000Z');
  });

  test('converts decimal amounts to cents', () => {
    expect(toCents('1234.56')).toBe(123456);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(null)).toBeUndefined();
  });
});

describe('delivery', () => {
  test('signs the exact body it sends', async () => {
    const calls = stubFetch([200]);
    expect(await deliver(config, 'client.created', { id: 'cl1' }, { log: silent })).toBe(true);
    const [call] = calls;
    expect(call.url).toBe('https://glouton.test/api/integrations/ardoise/webhook');
    expect(call.headers[EVENT_HEADER]).toBe('client.created');
    expect(verifySignature(SECRET, call.body, call.headers[SIGNATURE_HEADER])).toBe(true);
    const body = JSON.parse(call.body);
    expect(body).toMatchObject({ id: call.headers[DELIVERY_HEADER], event: 'client.created' });
    expect(body.data).toEqual({ id: 'cl1' });
  });

  test('retries server errors with the same delivery id, not client errors', async () => {
    const calls = stubFetch([503, 500, 200]);
    expect(
      await deliver(config, 'client.updated', {}, { log: silent, retryDelaysMs: [0, 0] })
    ).toBe(true);
    expect(new Set(calls.map((call) => call.headers[DELIVERY_HEADER])).size).toBe(1);
    expect(calls.length).toBe(3);

    const refused = stubFetch([400, 200]);
    expect(await deliver(config, 'client.updated', {}, { log: silent, retryDelaysMs: [0] })).toBe(
      false
    );
    expect(refused.length).toBe(1);
  });

  test('emit is inert without config', async () => {
    const calls = stubFetch([200]);
    let loaded = false;
    emit(null, 'client.created', async () => (loaded = true), { log: silent });
    await Bun.sleep(0);
    expect(loaded).toBe(false);
    expect(calls.length).toBe(0);
  });
});
