import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { documentRouter } from './router';

function dbCapturingPartyLookups(seen: { client: any[]; provider: any[] }) {
  const settings = {
    id: 'global',
    nextInvoiceNumber: 1,
    invoiceNumberFormat: 'FA-{{year}}-{{number}}',
  };

  const db: any = {
    $transaction: async (run: (tx: any) => Promise<unknown>) => run(db),
    settings: {
      findUnique: async () => settings,
      update: async () => settings,
    },
    spaceMember: { findUnique: async () => ({ role: 'MEMBER' }) },
    client: {
      findFirst: async ({ where }: any) => {
        seen.client.push(where);
        return null;
      },
    },
    provider: {
      findFirst: async ({ where }: any) => {
        seen.provider.push(where);
        return null;
      },
    },
  };

  return db as PrismaClient;
}

function ctxFor(db: PrismaClient) {
  return {
    db,
    user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {},
    env: {},
  } as any;
}

describe('the specialized prestation routers carry the space to the party lookup', () => {
  it('scopes the client lookup to the requested space', async () => {
    const seen = { client: [] as any[], provider: [] as any[] };
    const caller = documentRouter.createCaller(ctxFor(dbCapturingPartyLookups(seen)));

    await caller
      .createPrestationBarman({
        spaceId: 'space-a',
        clientId: 'client-1',
        providerId: 'provider-1',
        items: [{ description: 'Bar', quantity: 1, unit: 'h', price: 100 }],
        invoice_date: '2026-01-01',
        due_date: '2026-02-01',
        event_date: '2026-03-01',
        event_time: '20:00',
        event_location: 'Paris',
        service_duration: '4h',
        bar_setup_type: 'cocktail',
      } as any)
      .catch(() => {});

    expect(seen.client.length).toBe(1);
    expect(seen.client[0].spaceId).toBe('space-a');
  });
});
