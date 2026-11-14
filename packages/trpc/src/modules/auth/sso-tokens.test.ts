import { describe, expect, test } from 'bun:test';
import type { PrismaClient } from '@repo/types';
import { accountTokenStore, clearSsoTokens, saveSsoTokens } from './sso-tokens';

const SECRET = 'x'.repeat(32);
const ACCESS = 'plaintext-access-token-4f9d2b7e-1c3a-4e8b-9a60-d5b7c2e81f34';
const REFRESH = 'plaintext-refresh-token-8a1e6c3d-7b2f-4d95-b0c4-3e9a5f7d2b16';
const ISSUER = 'https://sso.example.test';

function fakeDb() {
  const row: {
    accessToken: string | null;
    refreshToken: string | null;
    accessTokenExpiresAt: Date | null;
    refreshTokenExpiresAt: Date | null;
  } = { accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null };
  const db = {
    account: {
      updateMany: async ({ data }: { data: Partial<typeof row> }) => {
        Object.assign(row, data);
        return { count: 1 };
      },
      findFirst: async () => ({ ...row }),
    },
  };
  return { db: db as unknown as PrismaClient, row };
}

describe('SSO token storage', () => {
  test('seals both tokens at rest and reads them back', async () => {
    const { db, row } = fakeDb();
    await saveSsoTokens(db, ISSUER, 'sub-1', { accessToken: ACCESS, refreshToken: REFRESH, expiresIn: 900 }, SECRET);
    expect(row.accessToken).not.toContain(ACCESS);
    expect(row.refreshToken).not.toContain(REFRESH);
    const loaded = await accountTokenStore(db, ISSUER, SECRET).load('u1');
    expect(loaded?.accessToken).toBe(ACCESS);
    expect(loaded?.refreshToken).toBe(REFRESH);
    expect(loaded?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
  });

  test('a sign-in without a refresh token leaves the stored session alone', async () => {
    const { db, row } = fakeDb();
    await saveSsoTokens(db, ISSUER, 'sub-1', { accessToken: 'at', expiresIn: 900 }, SECRET);
    expect(row.accessToken).toBeNull();
  });

  test('a row sealed with another secret reads as no session', async () => {
    const { db } = fakeDb();
    await saveSsoTokens(db, ISSUER, 'sub-1', { accessToken: 'at', refreshToken: 'rt', expiresIn: 900 }, SECRET);
    const loaded = await accountTokenStore(db, ISSUER, 'y'.repeat(32)).load('u1');
    expect(loaded?.refreshToken).toBeNull();
  });

  test('records the refresh expiry and a local logout clears every stored token', async () => {
    const { db, row } = fakeDb();
    await saveSsoTokens(db, ISSUER, 'sub-1', { accessToken: 'at', refreshToken: 'rt', expiresIn: 900 }, SECRET);
    expect(row.refreshTokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    await clearSsoTokens(db, ISSUER, 'u1');
    expect(row).toEqual({ accessToken: null, refreshToken: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null });
  });
});
