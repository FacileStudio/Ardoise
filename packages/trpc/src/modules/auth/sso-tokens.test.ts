import { describe, expect, test } from 'bun:test';
import type { PrismaClient } from '@repo/types';
import { accountTokenStore, saveSsoTokens } from './sso-tokens';

const SECRET = 'x'.repeat(32);
const ISSUER = 'https://sso.example.test';

function fakeDb() {
  const row: { accessToken: string | null; refreshToken: string | null; accessTokenExpiresAt: Date | null } = {
    accessToken: null,
    refreshToken: null,
    accessTokenExpiresAt: null,
  };
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
    await saveSsoTokens(db, ISSUER, 'sub-1', { accessToken: 'at', refreshToken: 'rt', expiresIn: 900 }, SECRET);
    expect(row.accessToken).not.toContain('at');
    expect(row.refreshToken).not.toBe('rt');
    const loaded = await accountTokenStore(db, ISSUER, SECRET).load('u1');
    expect(loaded?.accessToken).toBe('at');
    expect(loaded?.refreshToken).toBe('rt');
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
});
