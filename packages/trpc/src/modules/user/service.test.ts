import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import type { AuthManager } from '@repo/auth';
import userService from './service';

const auth = {
  verifyPassword: async (password: string) => password === 'old-password',
  hashPassword: async (password: string) => `hash:${password}`,
} as unknown as AuthManager;

function recordingDb() {
  const calls: Array<{ op: string; args: any }> = [];
  const record = (op: string, result: unknown = {}) => async (args: any) => {
    calls.push({ op, args });
    return result;
  };
  const db = {
    user: {
      findUnique: async (args: any) => {
        calls.push({ op: 'user.findUnique', args });
        return args.where.email ? null : { id: 'u1', password: 'stored' };
      },
      findMany: record('user.findMany', []),
      create: record('user.create'),
      update: record('user.update'),
      delete: record('user.delete'),
    },
    session: { deleteMany: record('session.deleteMany') },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaClient;
  return { db, calls };
}

describe('userService password hash exposure', () => {
  it('omits the password hash from every query a router returns', async () => {
    const { db, calls } = recordingDb();

    await userService.getProfile(db, 'u1');
    await userService.getAllUsers(db);
    await userService.getUserById(db, 'u1');
    await userService.createUser(db, auth, {
      email: 'a@b.fr',
      password: 'password1',
      firstName: 'A',
      lastName: 'B',
      role: 'CLIENT',
    });
    await userService.updateProfile(db, 'u1', { firstName: 'X' });
    await userService.deleteUser(db, 'u1');
    await userService.deleteOwnAccount(db, 'u1');

    const returning = calls.filter(
      (c) => c.op !== 'session.deleteMany' && (c.op !== 'user.findUnique' || c.args.include)
    );
    expect(returning.length).toBe(7);
    for (const call of returning) {
      expect(call.args.omit).toEqual({ password: true });
    }
  });

  it('never selects refresh tokens or provider secrets with the user detail', async () => {
    const { db, calls } = recordingDb();

    await userService.getUserById(db, 'u1');

    const include = calls[0].args.include;
    expect(include.sessions.omit).toEqual({ token: true });
    expect(include.accounts.omit).toMatchObject({ accessToken: true, refreshToken: true, idToken: true });
  });
});

describe('userService session revocation', () => {
  it('revokes every other session when the password changes', async () => {
    const { db, calls } = recordingDb();

    await userService.changePassword(db, auth, 'u1', 'old-password', 'new-password', 'keep-me');

    const revoke = calls.find((c) => c.op === 'session.deleteMany');
    expect(revoke?.args.where).toEqual({ userId: 'u1', token: { not: 'keep-me' } });
  });

  it('revokes every session when an admin resets a password', async () => {
    const { db, calls } = recordingDb();

    await userService.adminUpdateUser(db, auth, 'u1', { password: 'new-password' });

    expect(calls.find((c) => c.op === 'session.deleteMany')?.args.where).toEqual({ userId: 'u1' });
  });

  it('keeps sessions when the admin edit does not touch the password', async () => {
    const { db, calls } = recordingDb();

    await userService.adminUpdateUser(db, auth, 'u1', { firstName: 'Z' });

    expect(calls.some((c) => c.op === 'session.deleteMany')).toBe(false);
  });
});
