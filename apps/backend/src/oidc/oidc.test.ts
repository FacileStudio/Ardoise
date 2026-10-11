import { describe, expect, test } from 'bun:test';
import type { PrismaClient } from '@repo/types';
import { claimsFromPayload, OidcFlowError } from './flow';
import { IdentityError, resolveUser } from './identity';
import { openState, pkceChallenge, safeRedirect, sealState } from './state';

const SECRET = 'x'.repeat(32);
const ORIGIN = 'https://app.example.com';
const FALLBACK = `${ORIGIN}/login`;

describe('safeRedirect', () => {
  test('accepts the frontend origin', () => {
    expect(safeRedirect(`${ORIGIN}/login`, FALLBACK, ORIGIN)).toBe(`${ORIGIN}/login`);
  });

  test.each([
    'https://app.example.com.evil.com/login',
    'https://evil.com',
    'javascript:alert(1)',
    'not a url',
  ])('rejects %s', (candidate) => {
    expect(safeRedirect(candidate, FALLBACK, ORIGIN)).toBe(FALLBACK);
  });
});

describe('state', () => {
  const payload = { state: 's', nonce: 'n', verifier: 'v', redirect: FALLBACK };

  test('round-trips', async () => {
    expect(await openState(await sealState(payload, SECRET), SECRET)).toEqual(payload);
  });

  test('rejects a tampered or foreign-signed cookie', async () => {
    const sealed = await sealState(payload, SECRET);
    expect(await openState(`${sealed}x`, SECRET)).toBeNull();
    expect(await openState(sealed, 'y'.repeat(32))).toBeNull();
  });

  test('pkce challenge matches the RFC 7636 example', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });
});

describe('claimsFromPayload', () => {
  test('email_verified must be literally true', () => {
    const base = { sub: 'u1', email: 'a@b.c' };
    expect(claimsFromPayload({ ...base, email_verified: true }).emailVerified).toBe(true);
    expect(claimsFromPayload({ ...base, email_verified: 'true' }).emailVerified).toBe(false);
    expect(claimsFromPayload(base).emailVerified).toBe(false);
  });

  test('requires sub and email', () => {
    expect(() => claimsFromPayload({ email: 'a@b.c' })).toThrow(OidcFlowError);
    expect(() => claimsFromPayload({ sub: 'u1' })).toThrow(OidcFlowError);
  });
});

describe('resolveUser', () => {
  const ISSUER = 'https://sso.example.com';
  const user = {
    id: 'user-1',
    email: 'a@b.c',
    firstName: 'A',
    lastName: 'B',
    role: 'CLIENT',
    avatar: null,
    coverImage: null,
    status: 'ACTIVE',
    isBanned: false,
    isSuspended: false,
    suspendedUntil: null,
  };

  const fakeDb = (opts: { linked?: boolean; byEmail?: boolean; issuerAccount?: boolean; banned?: boolean }) => {
    const calls: string[] = [];
    const row = { ...user, isBanned: opts.banned ?? false };
    const db = {
      account: {
        findUnique: async () => (opts.linked ? { user: row } : null),
        findFirst: async () => (opts.issuerAccount ? { id: 'acc' } : null),
        create: async () => calls.push('create'),
        deleteMany: async () => calls.push('deleteLegacy'),
      },
      user: {
        findFirst: async () => (opts.byEmail ? row : null),
        update: async () => row,
      },
      $transaction: async (ops: unknown[]) => ops,
    };
    return { db: db as unknown as PrismaClient, calls };
  };

  const claims = { sub: 'sub-1', email: 'a@b.c', emailVerified: true };
  const code = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e as IdentityError).code);

  test('uninvited email is refused', async () => {
    expect(await code(resolveUser(fakeDb({}).db, ISSUER, claims))).toBe('not_invited');
  });

  test('unverified email never links by email', async () => {
    const { db } = fakeDb({ byEmail: true });
    expect(await code(resolveUser(db, ISSUER, { ...claims, emailVerified: false }))).toBe(
      'email_unverified'
    );
  });

  test('invited user links by verified email', async () => {
    const { db } = fakeDb({ byEmail: true });
    expect((await resolveUser(db, ISSUER, claims)).id).toBe('user-1');
  });

  test('user already bound to another sub is refused', async () => {
    const { db } = fakeDb({ byEmail: true, issuerAccount: true });
    expect(await code(resolveUser(db, ISSUER, claims))).toBe('identity_conflict');
  });

  test('banned user is refused, even when already linked', async () => {
    const { db } = fakeDb({ linked: true, banned: true });
    expect(await code(resolveUser(db, ISSUER, claims))).toBe('blocked');
  });
});
