import { describe, expect, test } from 'bun:test';
import type { PrismaClient } from '@repo/types';
import { claimsFromPayload, OidcFlowError } from './flow';
import { IdentityError, resolveUser, ssoProfile } from './identity';
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

describe('ssoProfile', () => {
  test('prefers given and family names, else splits name, else the email', () => {
    const base = { sub: 's', email: 'jo@x.test', emailVerified: true };
    expect(ssoProfile({ ...base, givenName: 'Jo', familyName: 'Doe', name: 'Ignored' })).toMatchObject({
      firstName: 'Jo',
      lastName: 'Doe',
    });
    expect(ssoProfile({ ...base, name: ' Jo  Ann Doe ' })).toMatchObject({ firstName: 'Jo', lastName: 'Ann Doe' });
    expect(ssoProfile(base)).toMatchObject({ firstName: 'jo', lastName: '' });
    expect(ssoProfile({ ...base, picture: 'http://x.test/p' }).ssoPictureUrl).toBeNull();
    expect(ssoProfile({ ...base, picture: 'https://sso.test/avatars/s' }).ssoPictureUrl).toBe(
      'https://sso.test/avatars/s'
    );
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

  const fakeDb = (opts: {
    linked?: boolean;
    byEmail?: boolean;
    issuerAccount?: boolean;
    banned?: boolean;
    role?: string;
  }) => {
    const calls: string[] = [];
    const verified: unknown[] = [];
    const row = { ...user, role: opts.role ?? 'ADMIN', isBanned: opts.banned ?? false };
    const db = {
      account: {
        findUnique: async () => (opts.linked ? { user: row } : null),
        findFirst: async () => (opts.issuerAccount ? { id: 'acc' } : null),
        create: async () => calls.push('create'),
        deleteMany: async () => calls.push('deleteLegacy'),
      },
      user: {
        findFirst: async () => (opts.byEmail ? row : null),
        update: async (args: { data: Record<string, unknown> }) => {
          calls.push(`update:${args.data.role}:${args.data.firstName}:${args.data.lastName}`);
          verified.push(args.data.emailVerified);
          return { ...row, ...args.data };
        },
        create: async (args: { data: Record<string, unknown> }) => {
          calls.push(`create:${args.data.role}:${args.data.firstName}`);
          verified.push(args.data.emailVerified);
          return { ...row, id: 'new-user', ...args.data };
        },
      },
      $transaction: async (ops: unknown[]) => ops,
    };
    return { db: db as unknown as PrismaClient, calls, verified };
  };

  const claims = { sub: 'sub-1', email: 'a@b.c', emailVerified: true };
  const code = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e as IdentityError).code);

  test('a first SSO sign-in creates a MEMBER account, never ADMIN', async () => {
    const { db, calls } = fakeDb({});
    const created = await resolveUser(db, ISSUER, { ...claims, name: 'Yann Thevenin' });
    expect(created.id).toBe('new-user');
    expect(created.role).toBe('MEMBER' as typeof created.role);
    expect(calls).toEqual(['create:MEMBER:Yann']);
  });

  test('every SSO sign-in sets MEMBER and refreshes the name', async () => {
    const { db, calls } = fakeDb({ linked: true, role: 'MEMBER' });
    const user = await resolveUser(db, ISSUER, { ...claims, name: 'Yann Van Thevenin' });
    expect(user.role).toBe('MEMBER' as typeof user.role);
    expect(calls).toEqual(['update:MEMBER:Yann:Van Thevenin']);
  });

  test('a legacy ADMIN row signing in is relabelled MEMBER, by identity or by email', async () => {
    for (const opts of [{ linked: true }, { byEmail: true }]) {
      const { db, calls } = fakeDb({ ...opts, role: 'ADMIN' });
      const user = await resolveUser(db, ISSUER, { ...claims, name: 'Yann Thevenin' });
      expect(user.role).toBe('MEMBER' as typeof user.role);
      expect(calls.some((call) => call.includes('ADMIN'))).toBe(false);
    }
  });

  test('unverified email never links by email', async () => {
    const { db } = fakeDb({ byEmail: true });
    expect(await code(resolveUser(db, ISSUER, { ...claims, emailVerified: false }))).toBe(
      'email_unverified'
    );
  });

  test('a sign-in without a verified email claim never marks the email verified', async () => {
    const unverified = { ...claims, emailVerified: false };
    const linked = fakeDb({ linked: true, role: 'MEMBER' });
    await resolveUser(linked.db, ISSUER, unverified);
    expect(linked.verified).toEqual([undefined]);

    const verifiedSignIn = fakeDb({ linked: true, role: 'MEMBER' });
    await resolveUser(verifiedSignIn.db, ISSUER, claims);
    expect(verifiedSignIn.verified).toEqual([true]);

    const created = fakeDb({});
    expect(await code(resolveUser(created.db, ISSUER, unverified))).toBe('email_unverified');
    expect(created.verified).toEqual([]);
  });

  test('invited user links by verified email', async () => {
    const { db } = fakeDb({ byEmail: true });
    expect((await resolveUser(db, ISSUER, claims)).id).toBe('user-1');
  });

  test('a CLIENT row is never linked by email nor promoted', async () => {
    const byEmail = fakeDb({ byEmail: true, role: 'CLIENT' });
    expect(await code(resolveUser(byEmail.db, ISSUER, claims))).toBe('client_account');
    expect(byEmail.calls).toEqual([]);
    const linked = fakeDb({ linked: true, role: 'CLIENT' });
    expect(await code(resolveUser(linked.db, ISSUER, claims))).toBe('client_account');
    expect(linked.calls).toEqual([]);
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
