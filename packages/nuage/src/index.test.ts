import { afterEach, describe, expect, test } from 'bun:test';
import {
  delegatedNuageToken,
  NotConnectedError,
  nuageConfigFromEnv,
  nuageObjectName,
  storeContractInNuage,
  type SubjectTokens,
  type SubjectTokenStore,
} from './index';

const servers: Array<{ stop(force?: boolean): void }> = [];
afterEach(() => {
  while (servers.length) servers.pop()?.stop(true);
});

interface Seen {
  forms: URLSearchParams[];
  auth: string[];
  puts: Array<{ url: URL; auth: string; type: string; body: string }>;
}

function fake(options: { revoked?: string[]; deadRefresh?: boolean } = {}) {
  const seen: Seen = { forms: [], auth: [], puts: [] };
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/.well-known/openid-configuration') {
        return Response.json({ token_endpoint: `${url.origin}/token` });
      }
      if (url.pathname === '/token') {
        const form = new URLSearchParams(await request.text());
        seen.forms.push(form);
        seen.auth.push(request.headers.get('authorization') ?? '');
        if (form.get('grant_type') === 'refresh_token') {
          if (options.deadRefresh) return Response.json({ error: 'invalid_grant' }, { status: 400 });
          return Response.json({ access_token: 'fresh', refresh_token: 'rotated', expires_in: 900 });
        }
        if (options.revoked?.includes(form.get('subject_token') ?? '')) {
          return Response.json({ error: 'invalid_grant' }, { status: 400 });
        }
        return Response.json({ access_token: 'delegated', expires_in: 300 });
      }
      seen.puts.push({
        url,
        auth: request.headers.get('authorization') ?? '',
        type: request.headers.get('content-type') ?? '',
        body: await request.text(),
      });
      return new Response('{}', { status: 201 });
    },
  });
  servers.push(server);
  const origin = `http://127.0.0.1:${server.port}`;
  const config = nuageConfigFromEnv({
    NUAGE_URL: `${origin}/`,
    NUAGE_AUDIENCE: 'nuage-client',
    OIDC_ISSUER: origin,
    OIDC_CLIENT_ID: 'ardoise',
    OIDC_CLIENT_SECRET: 's3cret',
  });
  if (!config) throw new Error('config');
  return { config, seen };
}

function memoryStore(initial: SubjectTokens | null) {
  let current = initial;
  const store: SubjectTokenStore = {
    load: async () => current,
    save: async (_userId, tokens) => {
      current = tokens;
    },
  };
  return { store, current: () => current };
}

const live = (): SubjectTokens => ({
  accessToken: 'stored',
  refreshToken: 'r',
  expiresAt: new Date(Date.now() + 600_000),
});

describe('nuage config', () => {
  test('is disabled unless url, audience and the OIDC client are all set', () => {
    expect(nuageConfigFromEnv({ NUAGE_URL: 'https://n.test' })).toBeNull();
    expect(nuageConfigFromEnv({ NUAGE_URL: 'https://n.test', NUAGE_AUDIENCE: 'a' })).toBeNull();
    const config = nuageConfigFromEnv({
      NUAGE_URL: 'https://n.test/',
      NUAGE_AUDIENCE: 'a',
      OIDC_ISSUER: 'https://sso.test/',
      OIDC_CLIENT_ID: 'c',
      OIDC_CLIENT_SECRET: 's',
    });
    expect(config?.url).toBe('https://n.test');
    expect(config?.issuer).toBe('https://sso.test');
  });
});

describe('delegated token', () => {
  test('exchanges the stored access token for nuage.write as the Ardoise client', async () => {
    const { config, seen } = fake();
    const token = await delegatedNuageToken(config, memoryStore(live()).store, 'u1');
    expect(token).toBe('delegated');
    const form = seen.forms[0]!;
    expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:token-exchange');
    expect(form.get('subject_token')).toBe('stored');
    expect(form.get('audience')).toBe('nuage-client');
    expect(form.get('scope')).toBe('nuage.write');
    expect(seen.auth[0]).toBe(`Basic ${Buffer.from('ardoise:s3cret').toString('base64')}`);
    expect(seen.forms).toHaveLength(1);
  });

  test('refreshes an expired access token and keeps the rotated refresh token', async () => {
    const { config, seen } = fake();
    const memory = memoryStore({ accessToken: 'old', refreshToken: 'r', expiresAt: new Date(0) });
    await delegatedNuageToken(config, memory.store, 'u1');
    expect(seen.forms[1]!.get('subject_token')).toBe('fresh');
    expect(memory.current()?.refreshToken).toBe('rotated');
  });

  test('retries once with a forced refresh when Registre rejects the subject', async () => {
    const { config, seen } = fake({ revoked: ['stored'] });
    const token = await delegatedNuageToken(config, memoryStore(live()).store, 'u1');
    expect(token).toBe('delegated');
    expect(seen.forms.map((form) => form.get('grant_type'))).toEqual([
      'urn:ietf:params:oauth:grant-type:token-exchange',
      'refresh_token',
      'urn:ietf:params:oauth:grant-type:token-exchange',
    ]);
  });

  test('is not connected without tokens or with a dead refresh token', async () => {
    const dead = fake({ deadRefresh: true });
    const expired = memoryStore({ accessToken: null, refreshToken: 'dead', expiresAt: null });
    await expect(delegatedNuageToken(dead.config, expired.store, 'u1')).rejects.toBeInstanceOf(
      NotConnectedError
    );
    const quiet = fake();
    for (const initial of [null, { accessToken: null, refreshToken: null, expiresAt: null }]) {
      await expect(
        delegatedNuageToken(quiet.config, memoryStore(initial).store, 'u1')
      ).rejects.toBeInstanceOf(NotConnectedError);
    }
    expect(quiet.seen.forms).toHaveLength(0);
  });
});

describe('nuage contract archive', () => {
  test('puts the pdf under its key with the delegated token', async () => {
    const { config, seen } = fake();
    await storeContractInNuage(config, memoryStore(live()).store, {
      userId: 'u1',
      filename: 'Contrat 42.pdf',
      pdf: new Uint8Array([37, 80, 68, 70]),
      linkedTo: 'ardoise:contract:42',
    });
    const put = seen.puts[0]!;
    expect(put.url.pathname).toBe('/api/app/object');
    expect(put.url.searchParams.get('key')).toBe('ardoise:contract:42');
    expect(put.url.searchParams.get('name')).toBe('Contrat 42.pdf');
    expect(put.auth).toBe('Bearer delegated');
    expect(put.type).toBe('application/pdf');
    expect(put.body).toBe('%PDF');
  });

  test('does nothing without config and never throws when Nuage is unreachable', async () => {
    const input = { userId: 'u1', filename: 'a.pdf', pdf: new Uint8Array([1]), linkedTo: 'x' };
    await expect(storeContractInNuage(null, memoryStore(null).store, input)).resolves.toBeUndefined();
    const config = nuageConfigFromEnv({
      NUAGE_URL: 'http://127.0.0.1:1',
      NUAGE_AUDIENCE: 'a',
      OIDC_ISSUER: 'http://127.0.0.1:1',
      OIDC_CLIENT_ID: 'c',
      OIDC_CLIENT_SECRET: 's',
    });
    await expect(storeContractInNuage(config, memoryStore(live()).store, input)).resolves.toBeUndefined();
  });
});

describe('refresh rotation', () => {
  function strictRegistre(initial = 'r0') {
    let valid = initial;
    let serial = 0;
    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/.well-known/openid-configuration') {
          return Response.json({ token_endpoint: `${url.origin}/token` });
        }
        const form = new URLSearchParams(await request.text());
        if (form.get('grant_type') === 'refresh_token') {
          if (form.get('refresh_token') !== valid) return Response.json({ error: 'invalid_grant' }, { status: 400 });
          await Bun.sleep(20);
          valid = `r${++serial}`;
          return Response.json({ access_token: `a${serial}`, refresh_token: valid, expires_in: 900 });
        }
        return Response.json({ access_token: 'delegated', expires_in: 300 });
      },
    });
    servers.push(server);
    const origin = `http://127.0.0.1:${server.port}`;
    const config = nuageConfigFromEnv({
      NUAGE_URL: origin,
      NUAGE_AUDIENCE: 'a',
      OIDC_ISSUER: origin,
      OIDC_CLIENT_ID: 'c',
      OIDC_CLIENT_SECRET: 's',
    });
    return config!;
  }

  test('two concurrent archives for one user both succeed with a strictly rotating refresh token', async () => {
    const config = strictRegistre();
    const memory = memoryStore({ accessToken: 'old', refreshToken: 'r0', expiresAt: new Date(0) });
    const results = await Promise.all([
      delegatedNuageToken(config, memory.store, 'u1'),
      delegatedNuageToken(config, memory.store, 'u1'),
      delegatedNuageToken(config, memory.store, 'u1'),
    ]);
    expect(results).toEqual(['delegated', 'delegated', 'delegated']);
    expect(memory.current()?.refreshToken).toBe('r1');
  });

  test('a refresh token another process already rotated is re-read instead of reported as not connected', async () => {
    const config = strictRegistre('r5');
    const rows: SubjectTokens[] = [
      { accessToken: 'old', refreshToken: 'r0', expiresAt: new Date(0) },
      { accessToken: 'old', refreshToken: 'r5', expiresAt: new Date(0) },
    ];
    let loads = 0;
    const store: SubjectTokenStore = {
      load: async () => rows[Math.min(loads++, rows.length - 1)] ?? null,
      save: async () => undefined,
    };
    await expect(delegatedNuageToken(config, store, 'u2')).resolves.toBe('delegated');
  });
});

describe('nuageObjectName', () => {
  test('replaces slashes, strips control and invisible characters, ensures .pdf', () => {
    expect(nuageObjectName('2026/001')).toBe('2026-001.pdf');
    expect(nuageObjectName('a\\b\u0000c\u202Ed.PDF')).toBe('a-bcd.PDF');
    expect(nuageObjectName('  ')).toBe('document.pdf');
  });

  test('cuts to 255 bytes without splitting a character', () => {
    const name = nuageObjectName('é'.repeat(300));
    expect(Buffer.byteLength(name)).toBeLessThanOrEqual(255);
    expect(name.endsWith('.pdf')).toBe(true);
    expect(name).not.toContain('\uFFFD');
    const emoji = nuageObjectName('😀'.repeat(100));
    expect(Buffer.byteLength(emoji)).toBeLessThanOrEqual(255);
    expect(emoji).not.toContain('\uFFFD');
  });
});
