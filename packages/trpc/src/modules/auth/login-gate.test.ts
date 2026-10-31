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
  password: await auth.hashPassword('correct-password'),
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

  it('still lets a CLIENT in', async () => {
    expect(await attempt(await row('CLIENT'), 'correct-password', true)).toBe('ok');
  });

  it('lets everyone in when the mode is off', async () => {
    expect(await attempt(await row('ADMIN'), 'correct-password', false)).toBe('ok');
    expect(await attempt(await row('CLIENT'), 'correct-password', false)).toBe('ok');
  });
});
