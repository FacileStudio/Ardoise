import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { providerRouter } from './router';

function dbFor(member: { role: 'MEMBER' } | null, created: any[]) {
  return {
    spaceMember: {
      findUnique: async () => member,
      findMany: async () => (member ? [{ spaceId: 'space-a' }] : []),
    },
    provider: {
      create: async (args: any) => {
        created.push(args);
        return { id: 'provider-1' };
      },
    },
  } as unknown as PrismaClient;
}

function callerFor(member: { role: 'MEMBER' } | null, created: any[]) {
  return providerRouter.createCaller({
    db: dbFor(member, created),
    user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {},
    env: {},
  } as any);
}

describe('providerRouter.create', () => {
  it('creates a provider every space can use', async () => {
    const created: any[] = [];

    await callerFor(null, created).create({ name: 'Acme', spaceId: 'space-a' } as any);

    expect(created.length).toBe(1);
    expect(created[0].data.name).toBe('Acme');
    expect('spaceId' in created[0].data).toBe(false);
  });
});

describe('providerRouter.delete guards', () => {
  it('names what still uses the provider', async () => {
    const caller = providerRouter.createCaller({
      db: {
        provider: { findUnique: async () => ({ id: 'p-1', spaceId: null }) },
        document: { count: async () => 3 },
        missionProvider: { count: async () => 1 },
        spaceMember: { findUnique: async () => ({ role: 'MEMBER' }), findMany: async () => [{ spaceId: 'space-a' }] },
      },
      user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
      log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    } as any);

    await expect(caller.delete({ id: 'p-1' })).rejects.toThrow('3 document(s) and 1 mission(s)');
  });
});
