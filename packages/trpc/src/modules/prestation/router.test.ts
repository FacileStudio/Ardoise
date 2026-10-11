import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { prestationRouter } from './router';

const prestationRow = { id: 'p-1', clientId: 'client-1', spaceId: null, status: 'DRAFT' };

const invoice = {
  id: 'doc-1',
  prestationId: 'p-1',
  invoiceNumber: 'F-001',
  total: '1200.00',
  paymentTermsDays: 30,
};

function callerFor(db: Record<string, unknown>) {
  return prestationRouter.createCaller({
    db: db as unknown as PrismaClient,
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

describe('prestationRouter.create', () => {
  it('refuses a space the caller is not a member of', async () => {
    const created: any[] = [];
    const caller = callerFor({
      spaceMember: { findUnique: async () => null },
      prestation: { create: async (args: any) => created.push(args) },
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
      prestation: { create: async (args: any) => created.push(args) },
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

  it('lands the prestation in the requested space with its providers', async () => {
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
      prestation: {
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

describe('prestationRouter.setStatus', () => {
  const dbAt = (status: string, updated: any[]) => ({
    prestation: {
      findUnique: async () => ({ ...prestationRow, status }),
      update: async (args: any) => updated.push(args),
    },
  });

  it('refuses a jump that skips the quote and the invoice', async () => {
    const updated: any[] = [];

    await expect(
      callerFor(dbAt('DRAFT', updated)).setStatus({ id: 'p-1', status: 'PAID' })
    ).rejects.toThrow('Cannot move a prestation from DRAFT to PAID');

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
    ).rejects.toThrow('Cannot move a prestation from PAID to CANCELLED');
  });
});

describe('prestationRouter.delete', () => {
  it('keeps a prestation that holds an issued invoice', async () => {
    const deleted: any[] = [];
    const caller = callerFor({
      prestation: {
        findUnique: async () => prestationRow,
        delete: async (args: any) => deleted.push(args),
      },
      document: { count: async () => 1 },
      payment: { count: async () => 0 },
    });

    await expect(caller.delete({ id: 'p-1' })).rejects.toThrow('Cannot delete a prestation');

    expect(deleted.length).toBe(0);
  });

  it('deletes a prestation holding only drafts and quotes', async () => {
    const deleted: any[] = [];
    const caller = callerFor({
      prestation: {
        findUnique: async () => prestationRow,
        delete: async (args: any) => deleted.push(args),
      },
      document: { count: async () => 0 },
      payment: { count: async () => 0 },
    });

    await caller.delete({ id: 'p-1' });

    expect(deleted.length).toBe(1);
  });
});

describe('prestationRouter.createPayment', () => {
  const input = { id: 'p-1', documentId: 'doc-1', collectionMethod: 'MANUAL' } as const;

  const dbWith = (document: any, live: any, created: any[] = []) => ({
    prestation: { findUnique: async () => prestationRow, findFirst: async () => ({ id: 'p-1' }) },
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

  it('refuses a cancelled prestation', async () => {
    const db = dbWith(invoice, null);
    db.prestation.findUnique = async () => ({ ...prestationRow, status: 'CANCELLED' });

    await expect(callerFor(db).createPayment(input)).rejects.toThrow('Prestation is cancelled');
  });

  it('bills the invoice total and links the payment to its prestation and document', async () => {
    const created: any[] = [];

    await callerFor(dbWith(invoice, null, created)).createPayment(input);

    expect(created[0].data.amount).toBe(1200);
    expect(created[0].data.prestationId).toBe('p-1');
    expect(created[0].data.documentId).toBe('doc-1');
    expect(created[0].data.reference).toBe('F-001');
  });
});
