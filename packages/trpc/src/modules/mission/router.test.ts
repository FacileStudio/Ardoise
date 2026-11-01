import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { missionRouter } from './router';
import { syncMissionPaid } from './sync';

const missionRow = { id: 'p-1', clientId: 'client-1', spaceId: null, status: 'DRAFT' };

const invoice = {
  id: 'doc-1',
  missionId: 'p-1',
  invoiceNumber: 'F-001',
  total: '1200.00',
  paymentTermsDays: 30,
};

function callerFor(db: Record<string, unknown>) {
  return missionRouter.createCaller({
    db: {
      settings: { findUnique: async () => ({ id: 'global', webhookUrl: null, webhookEvents: [] }) },
      ...db,
    } as unknown as PrismaClient,
    auth: {},
    user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {},
    env: {},
    appOrigin: 'http://localhost:3000',
    getStripe: async () => null,
    getSmtp: async () => null,
  } as any);
}

describe('missionRouter.create', () => {
  it('refuses a space the caller is not a member of', async () => {
    const created: any[] = [];
    const caller = callerFor({
      spaceMember: { findUnique: async () => null },
      mission: { create: async (args: any) => created.push(args) },
    });

    await expect(
      caller.create({ name: 'Site', clientId: 'client-1', spaceId: 'space-a' } as any)
    ).rejects.toThrow(new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this space' }));

    expect(created.length).toBe(0);
  });

  it('refuses a client that lives outside the scope', async () => {
    const created: any[] = [];
    const caller = callerFor({
      client: { findFirst: async () => null },
      mission: { create: async (args: any) => created.push(args) },
    });

    await expect(caller.create({ name: 'Site', clientId: 'client-x' } as any)).rejects.toThrow(
      new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
    );

    expect(created.length).toBe(0);
  });

  it('refuses the same provider twice', async () => {
    const caller = callerFor({ client: { findFirst: async () => ({ id: 'client-1' }) } });

    await expect(
      caller.create({
        name: 'Site',
        clientId: 'client-1',
        providers: [{ providerId: 'prov-1' }, { providerId: 'prov-1', role: 'SUBCONTRACTOR' }],
      } as any)
    ).rejects.toThrow('A provider can only be linked once');
  });

  it('lands the mission in the requested space with its providers', async () => {
    const created: any[] = [];
    const where: any[] = [];
    const caller = callerFor({
      spaceMember: { findUnique: async () => ({ role: 'MEMBER' }) },
      client: {
        findFirst: async (args: any) => {
          where.push(args.where);
          return { id: 'client-1' };
        },
      },
      provider: { count: async () => 1 },
      mission: {
        create: async (args: any) => {
          created.push(args);
          return { id: 'p-1' };
        },
      },
    });

    await caller.create({
      name: 'Site',
      clientId: 'client-1',
      spaceId: 'space-a',
      providers: [{ providerId: 'prov-1' }],
    } as any);

    expect(where[0]).toEqual({ id: 'client-1', spaceId: 'space-a' });
    expect(created[0].data.spaceId).toBe('space-a');
    expect(created[0].data.providers).toEqual({
      create: [{ providerId: 'prov-1', role: 'LEAD' }],
    });
  });
});

describe('missionRouter.setStatus', () => {
  const dbAt = (status: string, updated: any[]) => ({
    mission: {
      findUnique: async () => ({ ...missionRow, status }),
      update: async (args: any) => updated.push(args),
    },
  });

  it('refuses a jump that skips the quote and the invoice', async () => {
    const updated: any[] = [];

    await expect(
      callerFor(dbAt('DRAFT', updated)).setStatus({ id: 'p-1', status: 'PAID' })
    ).rejects.toThrow('Cannot move a mission from DRAFT to PAID');

    expect(updated.length).toBe(0);
  });

  it('allows the next step', async () => {
    const updated: any[] = [];

    await callerFor(dbAt('QUOTED', updated)).setStatus({ id: 'p-1', status: 'ACCEPTED' });

    expect(updated[0].data).toEqual({ status: 'ACCEPTED' });
  });

  it('treats PAID as final', async () => {
    await expect(
      callerFor(dbAt('PAID', [])).setStatus({ id: 'p-1', status: 'CANCELLED' })
    ).rejects.toThrow('Cannot move a mission from PAID to CANCELLED');
  });
});

describe('missionRouter.delete', () => {
  it('keeps a mission that holds an issued invoice', async () => {
    const deleted: any[] = [];
    const caller = callerFor({
      mission: {
        findUnique: async () => missionRow,
        delete: async (args: any) => deleted.push(args),
      },
      document: { count: async () => 1 },
      payment: { count: async () => 0 },
    });

    await expect(caller.delete({ id: 'p-1' })).rejects.toThrow('still has 1 invoice(s)');

    expect(deleted.length).toBe(0);
  });

  it('deletes a mission holding only drafts and quotes', async () => {
    const deleted: any[] = [];
    const quotesDeleted: any[] = [];
    const caller = callerFor({
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
      mission: {
        findUnique: async () => missionRow,
        delete: async (args: any) => deleted.push(args),
      },
      document: {
        count: async () => 0,
        deleteMany: async (args: any) => quotesDeleted.push(args),
      },
      payment: { count: async () => 0 },
    });

    await caller.delete({ id: 'p-1' });

    expect(deleted.length).toBe(1);
    expect(quotesDeleted[0].where).toEqual({ missionId: 'p-1', type: 'devis' });
  });
});

describe('missionRouter.createPayment', () => {
  const input = { id: 'p-1', documentId: 'doc-1', collectionMethod: 'MANUAL' } as const;

  const dbWith = (document: any, live: any, created: any[] = [], moved: any[] = []) => ({
    mission: {
      findUnique: async () => missionRow,
      findFirst: async () => ({ id: 'p-1' }),
      updateMany: async (args: any) => moved.push(args),
    },
    document: { findFirst: async () => document, findMany: async () => [{ id: 'doc-1' }] },
    payment: {
      findFirst: async () => live,
      create: async (args: any) => {
        created.push(args);
        return { id: 'pay-1' };
      },
    },
    client: {
      findUnique: async () => ({
        id: 'client-1',
        spaceId: null,
        contactFirstName: 'A',
        contactLastName: 'B',
      }),
    },
  });

  it('refuses a document that is not an invoice', async () => {
    const quote = { ...invoice, invoiceNumber: null };

    await expect(callerFor(dbWith(quote, null)).createPayment(input)).rejects.toThrow(
      'Only an invoice can be paid'
    );
  });

  it('refuses a second live payment on the same invoice', async () => {
    await expect(callerFor(dbWith(invoice, { id: 'pay-0' })).createPayment(input)).rejects.toThrow(
      'This invoice already has a payment'
    );
  });

  it('refuses a cancelled mission', async () => {
    const db = dbWith(invoice, null);
    db.mission.findUnique = async () => ({ ...missionRow, status: 'CANCELLED' });

    await expect(callerFor(db).createPayment(input)).rejects.toThrow('Mission is cancelled');
  });

  it('bills the invoice total and links the payment to its mission and document', async () => {
    const created: any[] = [];

    await callerFor(dbWith(invoice, null, created)).createPayment(input);

    expect(created[0].data.amount).toBe(1200);
    expect(created[0].data.missionId).toBe('p-1');
    expect(created[0].data.documentId).toBe('doc-1');
    expect(created[0].data.reference).toBe('F-001');
  });

  it('moves an accepted mission to invoiced once the payment exists', async () => {
    const moved: any[] = [];

    await callerFor(dbWith(invoice, null, [], moved)).createPayment(input);

    expect(moved[0]).toEqual({
      where: { id: 'p-1', status: 'ACCEPTED' },
      data: { status: 'INVOICED' },
    });
  });
});

describe('mission status sync after a payment', () => {
  const dbFor = (
    invoices: string[],
    paid: string[],
    updates: any[],
    kinds: Record<string, string> = {}
  ) =>
    ({
      document: {
        findMany: async () => invoices.map((id) => ({ id, invoiceKind: kinds[id] ?? null })),
      },
      payment: { findMany: async () => paid.map((documentId) => ({ documentId })) },
      mission: { updateMany: async (args: any) => updates.push(args) },
    }) as unknown as PrismaClient;

  it('marks the mission paid once every invoice has a paid payment', async () => {
    const updates: any[] = [];

    await syncMissionPaid(dbFor(['d1', 'd2'], ['d1', 'd2'], updates), 'p-1');

    expect(updates[0]).toEqual({
      where: { id: 'p-1', status: 'INVOICED' },
      data: { status: 'PAID' },
    });
  });

  it('does not settle a mission whose only invoice is a paid deposit', async () => {
    const updates: any[] = [];

    await syncMissionPaid(dbFor(['d1'], ['d1'], updates, { d1: 'DEPOSIT' }), 'p-1');

    expect(updates.length).toBe(0);
  });

  it('settles a mission once the deposit and the balance are both paid', async () => {
    const updates: any[] = [];

    await syncMissionPaid(
      dbFor(['d1', 'd2'], ['d1', 'd2'], updates, { d1: 'DEPOSIT', d2: 'BALANCE' }),
      'p-1'
    );

    expect(updates[0].data).toEqual({ status: 'PAID' });
  });

  it('waits while one invoice is still unpaid', async () => {
    const updates: any[] = [];

    await syncMissionPaid(dbFor(['d1', 'd2'], ['d1'], updates), 'p-1');

    expect(updates.length).toBe(0);
  });

  it('leaves a mission with no invoice alone', async () => {
    const updates: any[] = [];

    await syncMissionPaid(dbFor([], [], updates), 'p-1');

    expect(updates.length).toBe(0);
  });

  it('ignores a payment that belongs to no mission', async () => {
    const updates: any[] = [];

    await syncMissionPaid(dbFor(['d1'], ['d1'], updates), null);

    expect(updates.length).toBe(0);
  });
});
