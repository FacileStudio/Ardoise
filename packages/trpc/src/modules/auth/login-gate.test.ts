import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/types';
import { AuthManager } from '@repo/auth';
import authService from './service';

const auth = new AuthManager({ encryptionSecret: 'x'.repeat(32) });

const row = async (role: 'ADMIN' | 'CLIENT') => ({
  id: `${role}-1`,
  email: `${role.toLowerCase()}@example.test`,
  firstName: 'A',
  lastName: 'B',
  role,
  avatar: null,
  coverImage: null,
  status: 'ACTIVE',
  isBanned: false,
  isSuspended: false,
  suspendedUntil: null,
  password: (await auth.hashPassword('correct-password')) as string | null,
});

const dbFor = (user: Awaited<ReturnType<typeof row>> | null) =>
  ({
    user: { findUnique: async () => user },
    session: { create: async () => ({}) },
  }) as unknown as PrismaClient;

const attempt = (user: Awaited<ReturnType<typeof row>> | null, password: string, ssoOnly: boolean) =>
  authService
    .login(dbFor(user), auth, { email: 'x@example.test', password }, undefined, { ssoOnly })
    .then(
      () => 'ok',
      (error: TRPCError) => `${error.code}:${error.message}`
    );

describe('authService.login', () => {
  it('refuses a CLIENT even with a leftover password hash and the right password', async () => {
    const client = await row('CLIENT');
    const wrong = await attempt(client, 'nope-nope-nope', false);
    expect(wrong).toBe('UNAUTHORIZED:Invalid credentials');
    expect(await attempt(client, 'correct-password', false)).toBe(wrong);
    expect(await attempt(client, 'correct-password', true)).toBe(wrong);
  });

  it('refuses a user without a password with the same error', async () => {
    const user = { ...(await row('ADMIN')), password: null };
    expect(await attempt(user, 'correct-password', false)).toBe('UNAUTHORIZED:Invalid credentials');
  });

  it('verifies against the decoy, never the stored hash, for a CLIENT', async () => {
    const client = await row('CLIENT');
    const verified: string[] = [];
    const spy = {
      hashPassword: (p: string) => auth.hashPassword(p),
      verifyPassword: (p: string, hash: string) => {
        verified.push(hash);
        return auth.verifyPassword(p, hash);
      },
    } as unknown as AuthManager;

    await authService
      .login(dbFor(client), spy, { email: 'x@example.test', password: 'correct-password' })
      .catch(() => undefined);

    expect(verified).toHaveLength(1);
    expect(verified[0]).not.toBe(client.password);
  });
});

describe('authService.login with SSO_ONLY', () => {
  it('refuses staff with the wrong-password error, even with the right password', async () => {
    const admin = await row('ADMIN');
    const wrong = await attempt(admin, 'nope-nope-nope', false);
    expect(wrong).toBe('UNAUTHORIZED:Invalid credentials');
    expect(await attempt(admin, 'correct-password', true)).toBe(wrong);
    expect(await attempt(admin, 'nope-nope-nope', true)).toBe(wrong);
  });

  it('answers an unknown email with the same error', async () => {
    expect(await attempt(null, 'whatever-pass', true)).toBe('UNAUTHORIZED:Invalid credentials');
  });

  it('lets staff in when the mode is off', async () => {
    expect(await attempt(await row('ADMIN'), 'correct-password', false)).toBe('ok');
  });
});
