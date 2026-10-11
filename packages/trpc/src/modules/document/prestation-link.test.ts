import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { loadDocumentContext, buildDocumentPersistenceBase } from './service';

function dbWith(prestation: unknown, seen: any[] = []) {
  return {
    client: { findFirst: async () => ({ id: 'client-1' }) },
    provider: { findFirst: async () => ({ id: 'provider-1', tvaRate: 20 }) },
    prestation: {
      findFirst: async (args: any) => {
        seen.push(args.where);
        return prestation;
      },
    },
    settings: { findUnique: async () => ({ id: 'global' }) },
  } as unknown as PrismaClient;
}

const load = (db: PrismaClient, prestationId?: string) =>
  loadDocumentContext(db, 'user-1', 'client-1', 'provider-1', undefined, prestationId);

describe('loadDocumentContext with a prestation', () => {
  it('looks the prestation up for this client in this scope', async () => {
    const seen: any[] = [];

    await load(dbWith({ id: 'p-1', status: 'DRAFT' }, seen), 'p-1');

    expect(seen).toEqual([{ id: 'p-1', clientId: 'client-1', spaceId: null }]);
  });

  it('hands back the validated prestation id', async () => {
    const context = await load(dbWith({ id: 'p-1', status: 'QUOTED' }), 'p-1');

    expect(context.prestationId).toBe('p-1');
  });

  it('refuses a prestation of another client or space', async () => {
    await expect(load(dbWith(null), 'p-x')).rejects.toThrow('Prestation not found');
  });

  it('refuses a cancelled prestation', async () => {
    await expect(load(dbWith({ id: 'p-1', status: 'CANCELLED' }), 'p-1')).rejects.toThrow(
      'Prestation is cancelled'
    );
  });

  it('leaves the document unlinked when no prestation is given', async () => {
    const context = await load(dbWith(null));

    expect(context.prestationId).toBeNull();
  });
});

describe('buildDocumentPersistenceBase', () => {
  it('stores the prestation id it is given', async () => {
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

    expect(base.prestationId).toBe('p-1');
  });
});
