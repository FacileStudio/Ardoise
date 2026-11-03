import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { documentRouter } from './router';

const parties = { clientId: 'client-1', providerId: 'provider-1' };
const items = [{ description: 'Item', quantity: 1, unit: 'h', price: 100 }];
const invoiceDates = { invoice_date: '2026-01-01', due_date: '2026-02-01' };
const prestationBase = { ...parties, ...invoiceDates, items };

const endpoints: Array<{ name: string; input: Record<string, unknown> }> = [
  { name: 'FacturePrestation', input: prestationBase },
  {
    name: 'Maintenance',
    input: {
      ...parties,
      items,
      quote_date: '2026-01-01',
      validity_date: '2026-02-01',
      maintenance_period: '12 mois',
    },
  },
  {
    name: 'BackContractuel',
    input: {
      ...parties,
      contract_date: '2026-01-01',
      project_name: 'Projet',
      valid_until: '2026-02-01',
      providers: [{ id: 'provider-2', role: 'dev', amount: 100 }],
    },
  },
  {
    name: 'AppelDeFonds',
    input: {
      ...parties,
      ...invoiceDates,
      project_step: 'Etape 1',
      project_name: 'Projet',
      payment_providers: [{ id: 'provider-2', amount_to_pay: 100 }],
    },
  },
  {
    name: 'ContratPrestation',
    input: { ...parties, contract_date: '2026-01-01' },
  },
  {
    name: 'ContratMaintenance',
    input: { ...parties, contract_date: '2026-01-01', maintenance_period: '12 mois' },
  },
  {
    name: 'PrestationBarman',
    input: {
      ...prestationBase,
      event_date: '2026-03-01',
      event_time: '20:00',
      event_location: 'Paris',
      service_duration: '4h',
      bar_setup_type: 'cocktail',
    },
  },
  {
    name: 'PrestationPhoto',
    input: {
      ...prestationBase,
      shoot_date: '2026-03-01',
      shoot_time: '10:00',
      shoot_location: 'Paris',
      shoot_duration: '4h',
      shoot_type: 'portrait',
    },
  },
  {
    name: 'PrestationVideo',
    input: {
      ...prestationBase,
      shoot_date: '2026-03-01',
      shoot_time: '10:00',
      shoot_location: 'Paris',
      shoot_duration: '4h',
      video_type: 'clip',
    },
  },
  {
    name: 'PrestationDesign',
    input: {
      ...prestationBase,
      project_name: 'Projet',
      project_type: 'identite',
      delivery_date: '2026-03-01',
    },
  },
  {
    name: 'PrestationDev',
    input: {
      ...prestationBase,
      project_name: 'Projet',
      tech_stack: 'Bun',
      delivery_date: '2026-03-01',
    },
  },
  {
    name: 'PrestationFormation',
    input: {
      ...prestationBase,
      training_date: '2026-03-01',
      training_time: '09:00',
      training_location: 'Paris',
      training_duration: '2j',
      training_topic: 'Svelte',
    },
  },
  {
    name: 'PrestationBtp',
    input: {
      ...prestationBase,
      site_address: '1 rue du Chantier',
      site_name: 'Chantier',
      work_start_date: '2026-03-01',
      work_type: 'gros oeuvre',
    },
  },
];

function dbFor(member: { role: 'MEMBER' } | null, seen: any[]) {
  const settings = {
    id: 'global',
    nextInvoiceNumber: 1,
    nextQuoteNumber: 1,
    nextContractNumber: 1,
    invoiceNumberFormat: 'FA-{{year}}-{{number}}',
    quoteNumberFormat: 'DE-{{year}}-{{number}}',
    contractNumberFormat: 'CO-{{year}}-{{number}}',
  };

  const db: any = {
    $transaction: async (run: (tx: any) => Promise<unknown>) => run(db),
    settings: { findUnique: async () => settings, update: async () => settings },
    spaceMember: {
      findUnique: async () => member,
      findMany: async () => (member ? [{ spaceId: 'space-a' }] : []),
    },
    client: {
      findFirst: async ({ where }: any) => {
        seen.push(where);
        return null;
      },
    },
    provider: { findFirst: async () => null, findMany: async () => [] },
  };

  return db as PrismaClient;
}

function callerFor(member: { role: 'MEMBER' } | null, seen: any[]) {
  return documentRouter.createCaller({
    db: dbFor(member, seen),
    user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {},
    env: {},
  } as any);
}

async function trpcErrorOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof TRPCError) {
      return { code: error.code, message: error.message };
    }
    throw error;
  }
  throw new Error('expected the call to throw');
}

describe.each(endpoints)('document router $name', ({ name, input }) => {
  for (const verb of ['create', 'preview'] as const) {
    const procedure = `${verb}${name}`;

    it(`${procedure} refuses a space the caller is not a member of`, async () => {
      const seen: any[] = [];
      const caller = callerFor(null, seen) as any;

      expect(await trpcErrorOf(() => caller[procedure]({ ...input, spaceId: 'space-a' }))).toEqual({
        code: 'FORBIDDEN',
        message: 'Not a member of this space',
      });
      expect(seen.length).toBe(0);
    });

    it(`${procedure} scopes the client lookup to the requested space`, async () => {
      const seen: any[] = [];
      const caller = callerFor({ role: 'MEMBER' }, seen) as any;

      expect(await trpcErrorOf(() => caller[procedure]({ ...input, spaceId: 'space-a' }))).toEqual({
        code: 'NOT_FOUND',
        message: 'Client not found',
      });
      expect(seen).toEqual([{ id: 'client-1', spaceId: 'space-a' }]);
    });

    it(`${procedure} looks a spaceless call up in the caller spaces only`, async () => {
      const seen: any[] = [];

      await trpcErrorOf(() => (callerFor({ role: 'MEMBER' }, seen) as any)[procedure](input));
      await trpcErrorOf(() => (callerFor(null, seen) as any)[procedure](input));

      expect(seen).toEqual([
        { id: 'client-1', spaceId: { in: ['space-a'] } },
        { id: 'client-1', spaceId: { in: [] } },
      ]);
    });
  }
});
