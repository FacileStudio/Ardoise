import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { providerRouter } from './router';

function dbFor(member: { role: 'MEMBER' } | null, created: any[]) {
  return {
    spaceMember: { findUnique: async () => member },
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
  it('refuses a space the caller is not a member of', async () => {
    const created: any[] = [];

    await expect(
      callerFor(null, created).create({ name: 'Acme', spaceId: 'space-a' } as any)
    ).rejects.toThrow(new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this space' }));

    expect(created.length).toBe(0);
  });

  it('lands the provider in the requested space', async () => {
    const created: any[] = [];

    await callerFor({ role: 'MEMBER' }, created).create({ name: 'Acme', spaceId: 'space-a' } as any);

    expect(created[0].data.spaceId).toBe('space-a');
  });

  it('pins a spaceless provider to personal rows', async () => {
    const created: any[] = [];

    await callerFor(null, created).create({ name: 'Acme' } as any);

    expect(created[0].data.spaceId).toBe(null);
  });
});
