import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { clientRouter } from './router';

const input = {
  contactFirstName: 'Ada',
  contactLastName: 'Lovelace',
  companyName: 'Acme',
};

function dbFor(member: { role: 'MEMBER' } | null, created: any[]) {
  return {
    spaceMember: {
      findUnique: async () => member,
      findMany: async () => (member ? [{ spaceId: 'space-a' }] : []),
    },
    settings: { findUnique: async () => ({ id: 'global', webhookUrl: null, webhookEvents: [] }) },
      space: { findUnique: async () => ({ platformStudio: true }) },
    client: {
      create: async (args: any) => {
        created.push(args);
        return { id: 'client-1' };
      },
    },
  } as unknown as PrismaClient;
}

function callerFor(member: { role: 'MEMBER' } | null, created: any[]) {
  return clientRouter.createCaller({
    db: dbFor(member, created),
    auth: {},
    user: { id: 'user-1', role: 'MEMBER', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {},
    env: {},
  } as any);
}

describe('clientRouter.create', () => {
  it('refuses a space the caller is not a member of', async () => {
    const created: any[] = [];

    await expect(
      callerFor(null, created).create({ ...input, spaceId: 'space-a' } as any)
    ).rejects.toThrow(new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this space' }));

    expect(created.length).toBe(0);
  });

  it('lands the client in the requested space', async () => {
    const created: any[] = [];

    await callerFor({ role: 'MEMBER' }, created).create({ ...input, spaceId: 'space-a' } as any);

    expect(created.length).toBe(1);
    expect(created[0].data.space).toEqual({ connect: { id: 'space-a' } });
  });

  it('refuses a client with no space', async () => {
    const created: any[] = [];

    await expect(callerFor({ role: 'MEMBER' }, created).create(input as any)).rejects.toThrow();

    expect(created.length).toBe(0);
  });
});
