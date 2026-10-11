import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { loadDocumentContext, buildDocumentPersistenceBase } from './service';

function dbWith(mission: unknown, seen: any[] = []) {
  return {
    client: { findFirst: async () => ({ id: 'client-1' }) },
    provider: { findFirst: async () => ({ id: 'provider-1', tvaRate: 20 }) },
    mission: {
      findFirst: async (args: any) => {
        seen.push(args.where);
        return mission;
      },
    },
    settings: { findUnique: async () => ({ id: 'global' }) },
  } as unknown as PrismaClient;
}

const load = (db: PrismaClient, missionId?: string) =>
  loadDocumentContext(db, 'user-1', 'client-1', 'provider-1', undefined, missionId);

describe('loadDocumentContext with a mission', () => {
  it('looks the mission up for this client in this scope', async () => {
    const seen: any[] = [];

    await load(dbWith({ id: 'p-1', status: 'DRAFT' }, seen), 'p-1');

    expect(seen).toEqual([{ id: 'p-1', clientId: 'client-1', spaceId: null }]);
  });

  it('hands back the validated mission id', async () => {
    const context = await load(dbWith({ id: 'p-1', status: 'QUOTED' }), 'p-1');

    expect(context.missionId).toBe('p-1');
  });

  it('refuses a mission of another client or space', async () => {
    await expect(load(dbWith(null), 'p-x')).rejects.toThrow('Mission not found');
  });

  it('refuses a cancelled mission', async () => {
    await expect(load(dbWith({ id: 'p-1', status: 'CANCELLED' }), 'p-1')).rejects.toThrow(
      'Mission is cancelled'
    );
  });

  it('leaves the document unlinked when no mission is given', async () => {
    const context = await load(dbWith(null));

    expect(context.missionId).toBeNull();
  });
});

describe('buildDocumentPersistenceBase', () => {
  it('stores the mission id it is given', async () => {
    const { scope } = await load(dbWith(null));
    const base = buildDocumentPersistenceBase(
      {} as any,
      'provider-1',
      10,
      'user-1',
      {} as any,
      scope,
      'p-1'
    );

    expect(base.missionId).toBe('p-1');
  });
});
