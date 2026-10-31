import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import type { AuthManager } from '@repo/auth';
import authService from './service';

const user = {
  id: 'u1',
  email: 'a@b.fr',
  firstName: 'A',
  lastName: 'B',
  role: 'CLIENT',
  avatar: null,
  coverImage: null,
  status: 'ACTIVE',
  isBanned: false,
  isSuspended: false,
  suspendedUntil: null,
  password: 'hash',
};

function auth(overrides: Partial<Record<string, unknown>> = {}) {
  const verified: string[] = [];
  const manager = {
    verifyPassword: async (_password: string, hash: string) => {
      verified.push(hash);
      return hash === 'hash';
    },
    hashPassword: async () => 'decoy',
    verifyRefreshToken: async () => ({ userId: 'u1' }),
    createToken: async () => 'access',
    createRefreshToken: async () => ({ token: 'new-refresh', expiresAt: new Date(Date.now() + 1e6) }),
    ...overrides,
  } as unknown as AuthManager;
  return { manager, verified };
}

describe('authService.login', () => {
  it('spends a password verification even when the email is unknown', async () => {
    const { manager, verified } = auth();
    const db = { user: { findUnique: async () => null } } as unknown as PrismaClient;

    await expect(
      authService.login(db, manager, { email: 'nobody@b.fr', password: 'whatever1' })
    ).rejects.toThrow('Invalid credentials');
    expect(verified).toHaveLength(1);
  });
});

describe('authService.refresh', () => {
  const session = { id: 's1', userId: 'u1', token: 'old', expiresAt: new Date(Date.now() + 1e6) };

  function refreshDb(rotatedCount: number) {
    return {
      session: {
        findUnique: async () => session,
        updateMany: async () => ({ count: rotatedCount }),
        deleteMany: async () => ({ count: 0 }),
      },
      user: { findUnique: async () => user },
    } as unknown as PrismaClient;
  }

  it('rotates the token', async () => {
    const { manager } = auth();

    const result = await authService.refresh(refreshDb(1), manager, 'old');

    expect(result.refreshToken).toBe('new-refresh');
  });

  it('rejects the loser of two concurrent refreshes with the same token', async () => {
    const { manager } = auth();

    await expect(authService.refresh(refreshDb(0), manager, 'old')).rejects.toThrow('revoked');
  });
});
