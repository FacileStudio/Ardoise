import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import spaceService, { scopeWhere, requireRowScope, requireRowsScope } from './service';
import clientService from '../client/service';
import mediaService from '../media/service';
import { paymentService } from '../payment/service';
import type { CreatePaymentInput } from '../payment/types';

function dbWithMembership(member: { role: 'OWNER' | 'ADMIN' | 'MEMBER' } | null) {
  return {
    spaceMember: {
      findUnique: async () => member,
    },
  } as unknown as PrismaClient;
}

function capturingClientDb() {
  const seen: any[] = [];
  const db = {
    client: {
      findMany: async ({ where }: any) => {
        seen.push(where);
        return [];
      },
      count: async ({ where }: any) => {
        seen.push(where);
        return 0;
      },
    },
  } as unknown as PrismaClient;
  return { db, seen };
}

describe('spaceService.resolveScope', () => {
  it('refuses a space the caller is not a member of', async () => {
    const db = dbWithMembership(null);

    await expect(spaceService.resolveScope(db, 'user-1', 'space-1')).rejects.toThrow(TRPCError);
  });

  it('resolves a space the caller is a member of', async () => {
    const db = dbWithMembership({ role: 'MEMBER' });

    expect(await spaceService.resolveScope(db, 'user-1', 'space-1')).toEqual({
      type: 'space',
      spaceId: 'space-1',
      userId: 'user-1',
    });
  });

  it('resolves an absent or empty space id to personal scope', async () => {
    const db = dbWithMembership(null);

    expect(await spaceService.resolveScope(db, 'user-1')).toEqual({
      type: 'personal',
      userId: 'user-1',
    });
    expect(await spaceService.resolveScope(db, 'user-1', '')).toEqual({
      type: 'personal',
      userId: 'user-1',
    });
  });
});

describe('scopeWhere', () => {
  it('pins personal scope to unspaced rows instead of every row', () => {
    expect(scopeWhere({ type: 'personal', userId: 'user-1' })).toEqual({ spaceId: null });
  });

  it('pins space scope to the resolved space', () => {
    expect(scopeWhere({ type: 'space', spaceId: 'space-1', userId: 'user-1' })).toEqual({
      spaceId: 'space-1',
    });
  });
});

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

describe('requireRowScope', () => {
  it('returns a personal row without consulting membership', async () => {
    const row = { id: 'client-1', spaceId: null };

    expect(await requireRowScope(dbWithMembership(null), 'user-1', row, 'Client not found')).toBe(
      row
    );
  });

  it('returns a space row when the caller is a member', async () => {
    const row = { id: 'client-1', spaceId: 'space-1' };

    expect(
      await requireRowScope(dbWithMembership({ role: 'MEMBER' }), 'user-1', row, 'Client not found')
    ).toBe(row);
  });

  it('refuses a space row the caller is not a member of', async () => {
    const db = dbWithMembership(null);

    expect(
      await trpcErrorOf(() =>
        requireRowScope(db, 'user-1', { id: 'client-1', spaceId: 'space-1' }, 'Client not found')
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'Client not found' });
  });

  it('answers a foreign row and a missing row identically so ids stay unguessable', async () => {
    const db = dbWithMembership(null);

    const foreign = await trpcErrorOf(() =>
      requireRowScope(db, 'user-1', { id: 'client-1', spaceId: 'space-1' }, 'Client not found')
    );
    const missing = await trpcErrorOf(() =>
      requireRowScope(db, 'user-1', null, 'Client not found')
    );

    expect(foreign).toEqual(missing);
  });

  it('lets a non-FORBIDDEN failure through instead of masking it as NOT_FOUND', async () => {
    const db = {
      spaceMember: {
        findUnique: async () => {
          throw new Error('connection reset');
        },
      },
    } as unknown as PrismaClient;

    await expect(
      requireRowScope(db, 'user-1', { id: 'client-1', spaceId: 'space-1' }, 'Client not found')
    ).rejects.toThrow('connection reset');
  });
});

describe('requireRowsScope', () => {
  it('refuses the batch when a single row is out of scope', async () => {
    const db = dbWithMembership(null);

    expect(
      await trpcErrorOf(() =>
        requireRowsScope(
          db,
          'user-1',
          [
            { id: 'doc-1', spaceId: null },
            { id: 'doc-2', spaceId: 'space-1' },
          ],
          'One or more documents not found'
        )
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'One or more documents not found' });
  });
});

describe('clientService.getClientById', () => {
  const foreignPayment = { id: 'pay-b', spaceId: 'space-b' };

  function dbWithClient(
    client: { id: string; spaceId: string | null } | null,
    member: { role: 'MEMBER' } | null
  ) {
    return {
      client: { findUnique: async () => client },
      payment: {
        findMany: async ({ where }: any) =>
          where.spaceId === foreignPayment.spaceId ? [foreignPayment] : [],
      },
      spaceMember: { findUnique: async () => member },
    } as unknown as PrismaClient;
  }

  it('reads a personal client', async () => {
    const client = { id: 'client-1', spaceId: null };

    const read = await clientService.getClientById(dbWithClient(client, null), 'user-1', 'client-1');

    expect(read as unknown).toEqual({ ...client, payments: [] });
  });

  it('does not return a payment from another space', async () => {
    const client = { id: 'client-1', spaceId: null };

    const read = await clientService.getClientById(dbWithClient(client, null), 'user-1', 'client-1');

    expect(read.payments).toEqual([]);
  });

  it('hides a client belonging to a space the caller is not in', async () => {
    const db = dbWithClient({ id: 'client-1', spaceId: 'space-1' }, null);

    expect(await trpcErrorOf(() => clientService.getClientById(db, 'user-1', 'client-1'))).toEqual({
      code: 'NOT_FOUND',
      message: 'Client not found',
    });
  });

  it('reads a space client for a member', async () => {
    const client = { id: 'client-1', spaceId: 'space-1' };
    const db = dbWithClient(client, { role: 'MEMBER' });

    expect((await clientService.getClientById(db, 'user-1', 'client-1')) as unknown).toEqual({
      ...client,
      payments: [],
    });
  });
});

describe('mediaService.resolveDownloadKey', () => {
  function dbWithReferences(options: {
    settingsLogoUrl?: string | null;
    providers?: Array<{ spaceId: string | null; logoUrl: string | null }>;
    documents?: Array<{ spaceId: string | null; pdfUrl: string | null }>;
    member?: { role: 'MEMBER' } | null;
  }) {
    return {
      settings: { findFirst: async () => ({ logoUrl: options.settingsLogoUrl ?? null }) },
      provider: { findMany: async () => options.providers ?? [] },
      document: { findMany: async () => options.documents ?? [] },
      spaceMember: { findUnique: async () => options.member ?? null },
    } as unknown as PrismaClient;
  }

  it('mints for a key the caller uploaded', async () => {
    expect(
      await mediaService.resolveDownloadKey(
        dbWithReferences({}),
        'user-1',
        'https://api.test/storage/uploads/user-1/1-logo.png'
      )
    ).toBe('uploads/user-1/1-logo.png');
  });

  it('refuses a key uploaded by another account', async () => {
    expect(
      await trpcErrorOf(() =>
        mediaService.resolveDownloadKey(
          dbWithReferences({}),
          'user-1',
          'https://api.test/storage/uploads/user-2/1-contract.pdf'
        )
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'File not found' });
  });

  it('refuses a receipt key no readable row references', async () => {
    expect(
      await trpcErrorOf(() =>
        mediaService.resolveDownloadKey(
          dbWithReferences({}),
          'user-1',
          'https://api.test/storage/receipts/payment-1-1700000000000.pdf'
        )
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'File not found' });
  });

  it('refuses a provider logo from a space the caller is not in', async () => {
    const db = dbWithReferences({
      providers: [
        { spaceId: 'space-1', logoUrl: 'https://api.test/storage/uploads/user-2/logo.png' },
      ],
      member: null,
    });

    expect(
      await trpcErrorOf(() =>
        mediaService.resolveDownloadKey(
          db,
          'user-1',
          'https://api.test/storage/uploads/user-2/logo.png'
        )
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'File not found' });
  });

  it('mints a provider logo for a member of the provider space', async () => {
    const db = dbWithReferences({
      providers: [
        { spaceId: 'space-1', logoUrl: 'https://api.test/storage/uploads/user-2/logo.png' },
      ],
      member: { role: 'MEMBER' },
    });

    expect(
      await mediaService.resolveDownloadKey(
        db,
        'user-1',
        'https://api.test/storage/uploads/user-2/logo.png'
      )
    ).toBe('uploads/user-2/logo.png');
  });

  it('mints the instance logo for any authenticated caller', async () => {
    const db = dbWithReferences({
      settingsLogoUrl: 'https://api.test/storage/uploads/user-2/brand.png',
    });

    expect(
      await mediaService.resolveDownloadKey(
        db,
        'user-1',
        'https://api.test/storage/uploads/user-2/brand.png'
      )
    ).toBe('uploads/user-2/brand.png');
  });

  it('refuses a path that walks out of the storage root', async () => {
    expect(
      await trpcErrorOf(() =>
        mediaService.resolveDownloadKey(dbWithReferences({}), 'user-1', 'storage/uploads/../../etc/passwd')
      )
    ).toEqual({
      code: 'BAD_REQUEST',
      message: 'Invalid file URL: storage path not found',
    });
  });
});

describe('paymentService.getPaymentById', () => {
  const foreignClient = { id: 'client-1', spaceId: 'space-b', companyName: 'Other Co' };
  const foreignAttachment = {
    id: 'pd-1',
    document: { id: 'doc-b', spaceId: 'space-b', name: 'Other contract' },
  };

  function dbWithForeignChildren() {
    return {
      payment: {
        findUnique: async () => ({
          id: 'pay-1',
          clientId: 'client-1',
          spaceId: null,
          invoices: [],
          client: foreignClient,
          attachedDocuments: [foreignAttachment],
        }),
      },
      client: {
        findFirst: async ({ where }: any) =>
          where.spaceId === foreignClient.spaceId ? foreignClient : null,
      },
      paymentDocument: {
        findMany: async ({ where }: any) =>
          where.document.spaceId === foreignAttachment.document.spaceId ? [foreignAttachment] : [],
      },
      spaceMember: { findUnique: async () => null },
    } as unknown as PrismaClient;
  }

  it('does not return a client or a document from another space', async () => {
    const payment = (await paymentService.getPaymentById(
      dbWithForeignChildren(),
      'user-1',
      'pay-1'
    )) as any;

    expect(payment.client).toBe(null);
    expect(payment.attachedDocuments).toEqual([]);
  });
});

describe('paymentService.createPayment', () => {
  function dbForCreate(
    clientSpaceId: string | null,
    documentSpaceId: string | null,
    created: any[]
  ) {
    return {
      client: {
        findUnique: async () => ({
          id: 'client-1',
          spaceId: clientSpaceId,
          contactEmail: null,
          contactFirstName: 'Ada',
          contactLastName: 'Lovelace',
          user: null,
        }),
      },
      document: {
        findMany: async ({ where }: any) =>
          where.spaceId === documentSpaceId ? [{ id: 'doc-1', spaceId: documentSpaceId }] : [],
      },
      payment: {
        create: async (args: any) => {
          created.push(args);
          return { id: 'pay-1' };
        },
      },
      spaceMember: { findUnique: async () => ({ role: 'MEMBER' }) },
    } as unknown as PrismaClient;
  }

  const input: CreatePaymentInput = {
    clientId: 'client-1',
    amount: 100,
    description: 'Prestation',
    frequency: 'ONE_TIME',
    collectionMethod: 'MANUAL',
    dueDate: new Date('2026-01-01'),
    attachedFiles: [],
    attachedDocumentIds: ['doc-1'],
  };

  it('refuses a document from a different space than the payment', async () => {
    const created: any[] = [];

    expect(
      await trpcErrorOf(() =>
        paymentService.createPayment(
          dbForCreate(null, 'space-b', created),
          'user-1',
          null,
          null,
          {} as any,
          'https://app.test',
          input
        )
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'One or more documents not found' });
    expect(created.length).toBe(0);
  });

  it('accepts a document in the same space as the payment', async () => {
    const created: any[] = [];

    await paymentService.createPayment(
      dbForCreate('space-a', 'space-a', created),
      'user-1',
      null,
      null,
      {} as any,
      'https://app.test',
      input
    );

    expect(created.length).toBe(1);
    expect(created[0].data.spaceId).toBe('space-a');
  });
});

describe('clientService.listClients', () => {
  it('never queries without a spaceId filter', async () => {
    const { db, seen } = capturingClientDb();

    await clientService.listClients(db, { page: 1, limit: 10 }, { type: 'personal', userId: 'u' });
    await clientService.listClients(
      db,
      { page: 1, limit: 10, search: 'acme' },
      { type: 'space', spaceId: 'space-1', userId: 'u' }
    );

    expect(seen.length).toBe(4);
    expect(seen.slice(0, 2).every((where) => where.spaceId === null)).toBe(true);
    expect(seen.slice(2).every((where) => where.spaceId === 'space-1')).toBe(true);
  });
});
