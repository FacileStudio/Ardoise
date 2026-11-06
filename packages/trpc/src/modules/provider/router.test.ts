import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { providerRouter } from './router';

const silent = { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} };

function dbFor(options: {
  member: { role: 'MEMBER' } | null;
  provider?: Record<string, unknown> | null;
  created?: any[];
  studio?: boolean;
}) {
  return {
    spaceMember: {
      findUnique: async () => options.member,
      findMany: async () =>
        options.member ? [{ spaceId: 'space-a', space: { platformStudio: options.studio ?? false } }] : [],
    },
    provider: {
      create: async (args: any) => {
        options.created?.push(args);
        return { id: 'provider-1' };
      },
      findFirst: async () => options.provider ?? null,
    },
    document: { count: async () => 3 },
    missionProvider: { count: async () => 1 },
    user: { findUnique: async () => ({ role: 'MEMBER', status: 'ACTIVE', isBanned: false, accounts: [] }) },
  } as unknown as PrismaClient;
}

function callerFor(db: PrismaClient) {
  return providerRouter.createCaller({
    db,
    user: { id: 'user-1', role: 'MEMBER', email: 'a@b.c' },
    log: silent,
    storage: {},
    env: { OIDC_ISSUER: 'https://sso.test', PLATFORM_STAFF_SUBS: 'sub-staff' },
  } as any);
}

describe('providerRouter.create', () => {
  it('stamps the provider with a space the caller belongs to', async () => {
    const created: any[] = [];

    await callerFor(dbFor({ member: { role: 'MEMBER' }, created })).create({ name: 'Acme', spaceId: 'space-a' } as any);

    expect(created[0].data).toMatchObject({ name: 'Acme', spaceId: 'space-a' });
  });

  it('refuses a space the caller is not a member of', async () => {
    const created: any[] = [];

    await expect(
      callerFor(dbFor({ member: null, created })).create({ name: 'Acme', spaceId: 'space-b' } as any)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(created).toEqual([]);
  });

  it('refuses a logo the caller did not upload', async () => {
    await expect(
      callerFor(dbFor({ member: { role: 'MEMBER' } })).create({
        name: 'Acme',
        spaceId: 'space-a',
        logoUrl: 'https://api.test/storage/documents/space-b/invoice.pdf',
      } as any)
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('providerRouter writes', () => {
  it('answers NOT_FOUND for a provider outside the caller spaces', async () => {
    const caller = callerFor(dbFor({ member: { role: 'MEMBER' }, provider: null }));

    await expect(caller.get({ id: 'p-b' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(caller.update({ id: 'p-b', data: { iban: 'FR76 attacker' } })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.delete({ id: 'p-b' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('keeps shared providers for platform staff', async () => {
    const caller = callerFor(
      dbFor({ member: { role: 'MEMBER' }, studio: true, provider: { id: 'p-1', spaceId: null, logoUrl: null } })
    );

    await expect(caller.update({ id: 'p-1', data: { iban: 'FR76 attacker' } })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('names what still uses the provider', async () => {
    const caller = callerFor(
      dbFor({ member: { role: 'MEMBER' }, provider: { id: 'p-1', spaceId: 'space-a', logoUrl: null } })
    );

    await expect(caller.delete({ id: 'p-1' })).rejects.toThrow('3 document(s) and 1 mission(s)');
  });
});
