import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import userService from './service';

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
    await userService.updateProfile(db, 'u1', { firstName: 'X' });

    const returning = calls.filter((c) => c.op !== 'user.findUnique' || c.args.include);
    expect(returning.length).toBe(2);
    for (const call of returning) {
      expect(call.args.omit).toEqual({ password: true });
    }
  });
});
