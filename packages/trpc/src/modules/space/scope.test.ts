import { describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import spaceService, {
  scopeWhere,
  scopeConnect,
  scopeSpaceId,
  requireRowScope,
  requireRowsScope,
  type Scope,
} from './service';
import clientService from '../client/service';
import mediaService from '../media/service';
import { paymentService } from '../payment/service';
import { loadDocumentContext, buildDocumentPersistenceBase } from '../document/service';
import type { CreatePaymentInput } from '../payment/types';
import type { CreateClientInput } from '../client/types';

function dbWithMembership(member: { role: 'OWNER' | 'ADMIN' | 'MEMBER' } | null) {
  return {
    spaceMember: {
      findUnique: async () => member,
      findMany: async () => (member ? [{ spaceId: 'space-1' }, { spaceId: 'space-2' }] : []),
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

    expect(await spaceService.resolveScope(db, 'user-1', 'space-1')).toMatchObject({
      type: 'space',
      spaceId: 'space-1',
      userId: 'user-1',
    });
  });

  it('resolves an absent or empty space id to every space the caller belongs to', async () => {
    const db = dbWithMembership({ role: 'MEMBER' });

    expect(await spaceService.resolveScope(db, 'user-1')).toMatchObject({
      type: 'spaces',
      spaceIds: ['space-1', 'space-2'],
      userId: 'user-1',
    });
    expect(await spaceService.resolveScope(db, 'user-1', '')).toMatchObject({
      type: 'spaces',
      spaceIds: ['space-1', 'space-2'],
    });
  });

  it('resolves a caller in no space to no space, never to every row', async () => {
    expect(await spaceService.resolveScope(dbWithMembership(null), 'user-1')).toMatchObject({
      type: 'spaces',
      spaceIds: [],
    });
  });
});

function resolvedSpaceScope(spaceId: string, userId = 'user-1') {
  return spaceService.resolveScope(dbWithMembership({ role: 'MEMBER' }), userId, spaceId);
}

function resolvedEverySpaceScope(userId = 'user-1') {
  return spaceService.resolveScope(dbWithMembership({ role: 'MEMBER' }), userId);
}

const forgedSpaceScope = {
  type: 'space',
  spaceId: 'space-1',
  userId: 'mallory',
} as unknown as Scope;

const forgedEverySpaceScope = {
  type: 'spaces',
  spaceIds: ['space-1'],
  userId: 'mallory',
} as unknown as Scope;

describe('a Scope that resolveScope did not mint', () => {
  it('is refused by the read boundary', () => {
    expect(() => scopeWhere(forgedSpaceScope)).toThrow(TRPCError);
    expect(() => scopeWhere(forgedEverySpaceScope)).toThrow(TRPCError);
  });

  it('is refused by the create boundary', () => {
    expect(() => scopeConnect(forgedSpaceScope)).toThrow(TRPCError);
  });

  it('is refused by the document persistence boundary', () => {
    expect(() =>
      buildDocumentPersistenceBase(
        {} as any,
        'provider-1',
        100,
        'user-1',
        {} as any,
        forgedSpaceScope
      )
    ).toThrow(TRPCError);
  });
});

describe('scopeWhere', () => {
  it('pins an every-space scope to the caller spaces instead of every row', async () => {
    expect(scopeWhere(await resolvedEverySpaceScope())).toEqual({
      spaceId: { in: ['space-1', 'space-2'] },
    });
  });

  it('pins space scope to the resolved space', async () => {
    expect(scopeWhere(await resolvedSpaceScope('space-1'))).toEqual({
      spaceId: 'space-1',
    });
  });
});

describe('scopeConnect', () => {
  it('attaches a created row to the resolved space', async () => {
    expect(scopeConnect(await resolvedSpaceScope('space-1'))).toEqual({
      space: { connect: { id: 'space-1' } },
    });
  });

  it('refuses to guess a space from an every-space scope', async () => {
    const scope = await resolvedEverySpaceScope();

    expect(() => scopeConnect(scope)).toThrow('Choose a space');
    expect(() => scopeSpaceId(scope)).toThrow('Choose a space');
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
            { id: 'doc-1', spaceId: 'space-2' },
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

  it('does not return a payment from another space', async () => {
    const client = { id: 'client-1', spaceId: 'space-1' };

    const read = await clientService.getClientById(
      dbWithClient(client, { role: 'MEMBER' }),
      'user-1',
      'client-1'
    );

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
    providers?: Array<{ logoUrl: string | null; spaceId?: string | null }>;
    documents?: Array<{ spaceId: string; pdfUrl: string | null }>;
    member?: { role: 'MEMBER' } | null;
    studio?: boolean;
  }) {
    return {
      settings: { findFirst: async () => ({ logoUrl: options.settingsLogoUrl ?? null }) },
      provider: {
        findMany: async () => (options.providers ?? []).map((row) => ({ spaceId: null, ...row })),
      },
      document: { findMany: async () => options.documents ?? [] },
      spaceMember: {
        findUnique: async () => options.member ?? null,
        findFirst: async () => (options.studio ? { id: 'm1' } : null),
      },
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

  it('refuses a shared provider logo outside a platform studio space', async () => {
    const db = dbWithReferences({
      providers: [{ logoUrl: 'https://api.test/storage/uploads/user-2/logo.png' }],
      studio: false,
    });

    expect(
      await trpcErrorOf(() =>
        mediaService.resolveDownloadKey(db, 'user-1', 'https://api.test/storage/uploads/user-2/logo.png')
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'File not found' });
  });

  it('mints a shared provider logo for a platform studio member', async () => {
    const db = dbWithReferences({
      providers: [{ logoUrl: 'https://api.test/storage/uploads/user-2/logo.png' }],
      studio: true,
    });

    expect(
      await mediaService.resolveDownloadKey(db, 'user-1', 'https://api.test/storage/uploads/user-2/logo.png')
    ).toBe('uploads/user-2/logo.png');
  });

  it('needs the provider space for a per-space provider logo', async () => {
    const logo = 'https://api.test/storage/uploads/user-2/logo.png';
    const outsider = dbWithReferences({ providers: [{ logoUrl: logo, spaceId: 'space-b' }], member: null, studio: true });
    expect(await trpcErrorOf(() => mediaService.resolveDownloadKey(outsider, 'user-1', logo))).toEqual({
      code: 'NOT_FOUND',
      message: 'File not found',
    });
    const member = dbWithReferences({ providers: [{ logoUrl: logo, spaceId: 'space-b' }], member: { role: 'MEMBER' } });
    expect(await mediaService.resolveDownloadKey(member, 'user-1', logo)).toBe('uploads/user-2/logo.png');
  });

  it('never unlocks another space document through a provider pointing at it', async () => {
    const pdf = 'https://api.test/storage/documents/space-b/invoice.pdf';
    const db = dbWithReferences({
      documents: [{ spaceId: 'space-b', pdfUrl: pdf }],
      providers: [{ logoUrl: pdf, spaceId: 'space-a' }],
      member: null,
      studio: true,
    });

    expect(await trpcErrorOf(() => mediaService.resolveDownloadKey(db, 'user-1', pdf))).toEqual({
      code: 'NOT_FOUND',
      message: 'File not found',
    });
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
          spaceId: 'space-a',
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
      spaceMember: { findUnique: async () => ({ role: 'MEMBER' }) },
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
          dbForCreate('space-a', 'space-b', created),
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

    await clientService.listClients(
      db,
      { page: 1, limit: 10 },
      await resolvedEverySpaceScope('u')
    );
    await clientService.listClients(
      db,
      { page: 1, limit: 10, search: 'acme' },
      await resolvedSpaceScope('space-1', 'u')
    );

    expect(seen.length).toBe(4);
    expect(seen.slice(0, 2).every((where) => where.spaceId.in.length === 2)).toBe(true);
    expect(seen.slice(2).every((where) => where.spaceId === 'space-1')).toBe(true);
  });
});

describe('the create path carries the space', () => {
  const clientInput: CreateClientInput = {
    spaceId: 'space-a',
    contactFirstName: 'Ada',
    contactLastName: 'Lovelace',
    companyName: 'Analytical Engines',
    createCredentials: false,
  };

  function dbForClientCreate(member: { role: 'MEMBER' } | null, created: any[]) {
    return {
      spaceMember: {
        findUnique: async () => member,
        findMany: async () => (member ? [{ spaceId: 'space-a' }] : []),
      },
      client: {
        create: async (args: any) => {
          created.push(args);
          return { id: 'client-1' };
        },
      },
    } as unknown as PrismaClient;
  }

  async function createClientThroughRouter(
    db: PrismaClient,
    userId: string,
    spaceId: string | undefined,
    input: CreateClientInput
  ) {
    const scope = await spaceService.resolveScope(db, userId, spaceId);
    return clientService.createClient(db, input, scope);
  }

  it('refuses a client create in a space the caller is not a member of', async () => {
    const created: any[] = [];
    const db = dbForClientCreate(null, created);

    expect(
      await trpcErrorOf(() => createClientThroughRouter(db, 'user-1', 'space-a', clientInput))
    ).toEqual({ code: 'FORBIDDEN', message: 'Not a member of this space' });
    expect(created.length).toBe(0);
  });

  it('lands a client in the active space', async () => {
    const created: any[] = [];
    const db = dbForClientCreate({ role: 'MEMBER' }, created);

    await createClientThroughRouter(db, 'user-1', 'space-a', clientInput);

    expect(created.length).toBe(1);
    expect(created[0].data.space).toEqual({ connect: { id: 'space-a' } });
  });

  it('refuses a client create that names no space', async () => {
    const created: any[] = [];
    const db = dbForClientCreate({ role: 'MEMBER' }, created);

    expect(
      await trpcErrorOf(() => createClientThroughRouter(db, 'user-1', undefined, clientInput))
    ).toEqual({ code: 'BAD_REQUEST', message: 'Choose a space' });
    expect(created.length).toBe(0);
  });

  it('stamps a document with the scope it was created in', async () => {
    const persisted = buildDocumentPersistenceBase(
      {} as any,
      'provider-1',
      100,
      'user-1',
      {} as any,
      await resolvedSpaceScope('space-a')
    );

    expect((persisted as { spaceId?: string | null }).spaceId).toBe('space-a');
  });
});

describe('loadDocumentContext', () => {
  function dbWithParties(options: {
    client?: { id: string; spaceId: string };
    provider?: { id: string };
    member?: { role: 'MEMBER' } | null;
  }) {
    const matches = (row: { spaceId: string } | undefined, where: any) =>
      row !== undefined &&
      (where.spaceId?.in ? where.spaceId.in.includes(row.spaceId) : where.spaceId === row.spaceId);

    return {
      spaceMember: {
        findUnique: async () => options.member ?? null,
        findMany: async () =>
          options.member ? [{ spaceId: 'space-a' }, { spaceId: 'space-b' }] : [],
      },
      settings: { findUnique: async () => ({ id: 'settings' }) },
      client: {
        findFirst: async ({ where }: any) => (matches(options.client, where) ? options.client : null),
        findUnique: async () => options.client ?? null,
      },
      provider: { findFirst: async () => options.provider ?? null },
      space: { findUnique: async () => ({ platformStudio: true }) },
    } as unknown as PrismaClient;
  }

  it('refuses a client that does not live in the requested space', async () => {
    const db = dbWithParties({
      client: { id: 'client-1', spaceId: 'space-b' },
      provider: { id: 'provider-1' },
      member: { role: 'MEMBER' },
    });

    expect(
      await trpcErrorOf(() =>
        loadDocumentContext(db, 'user-1', 'client-1', 'provider-1', 'space-a')
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'Client not found' });
  });

  it('refuses a provider that does not exist', async () => {
    const db = dbWithParties({
      client: { id: 'client-1', spaceId: 'space-a' },
      member: { role: 'MEMBER' },
    });

    expect(
      await trpcErrorOf(() =>
        loadDocumentContext(db, 'user-1', 'client-1', 'provider-1', 'space-a')
      )
    ).toEqual({ code: 'NOT_FOUND', message: 'Provider not found' });
  });

  it('returns the resolved scope so the created row can be stamped with it', async () => {
    const db = dbWithParties({
      client: { id: 'client-1', spaceId: 'space-a' },
      provider: { id: 'provider-1' },
      member: { role: 'MEMBER' },
    });

    const context = await loadDocumentContext(db, 'user-1', 'client-1', 'provider-1', 'space-a');

    expect(context.scope).toMatchObject({ type: 'space', spaceId: 'space-a', userId: 'user-1' });
    expect(scopeWhere(context.scope)).toEqual({ spaceId: 'space-a' });
  });

  it('takes the space of the client when the call names no space', async () => {
    const db = dbWithParties({
      client: { id: 'client-1', spaceId: 'space-b' },
      provider: { id: 'provider-1' },
      member: { role: 'MEMBER' },
    });

    const context = await loadDocumentContext(db, 'user-1', 'client-1', 'provider-1');

    expect(scopeSpaceId(context.scope)).toBe('space-b');
  });
});

describe('paymentService.listClientPayments', () => {
  const foreignAttachment = {
    id: 'pd-1',
    document: { id: 'doc-b', spaceId: 'space-b', name: 'Other contract' },
  };

  function dbForClientPortal() {
    return {
      client: {
        findUnique: async () => ({ id: 'client-1', spaceId: 'space-a', userId: 'user-1' }),
        findFirst: async ({ where }: any) =>
          where.spaceId === 'space-a' ? { id: 'client-1', spaceId: 'space-a', user: null } : null,
      },
      payment: {
        findMany: async ({ where }: any) =>
          where.spaceId === 'space-a'
            ? [{ id: 'pay-1', clientId: 'client-1', spaceId: 'space-a' }]
            : [],
      },
      paymentDocument: {
        findMany: async ({ where }: any) =>
          where.document?.spaceId === foreignAttachment.document.spaceId
            ? [foreignAttachment]
            : [],
      },
    } as unknown as PrismaClient;
  }

  it('does not return a document from another space to the client portal', async () => {
    const result = (await paymentService.listClientPayments(
      dbForClientPortal(),
      'user-1'
    )) as any;

    expect(result.payments.length).toBe(1);
    expect(result.payments[0].attachedDocuments).toEqual([]);
  });
});

describe('spaceService.delete', () => {
  function dbWithSpaceContents(counts: {
    clients: number;
    documents: number;
    payments: number;
    missions: number;
  }) {
    return dbWithSpaceContentsTracked(counts).db;
  }

  function dbWithSpaceContentsTracked(counts: {
    clients: number;
    documents: number;
    payments: number;
    missions: number;
  }) {
    let depth = 0;
    const outsideTransaction: string[] = [];
    const record = (name: string) => {
      if (depth === 0) outsideTransaction.push(name);
    };

    const db: any = {
      $transaction: async (run: (tx: any) => Promise<unknown>) => {
        depth += 1;
        try {
          return await run(db);
        } finally {
          depth -= 1;
        }
      },
      spaceMember: { findUnique: async () => ({ role: 'OWNER' }) },
      client: {
        count: async () => {
          record('client.count');
          return counts.clients;
        },
      },
      document: {
        count: async () => {
          record('document.count');
          return counts.documents;
        },
      },
      payment: {
        count: async () => {
          record('payment.count');
          return counts.payments;
        },
      },
      mission: {
        count: async () => {
          record('mission.count');
          return counts.missions;
        },
      },
      space: {
        delete: async () => {
          record('space.delete');
          return { id: 'space-a' };
        },
      },
    };

    return { db: db as PrismaClient, outsideTransaction };
  }

  it('counts the held rows and deletes inside one transaction', async () => {
    const { db, outsideTransaction } = dbWithSpaceContentsTracked({
      clients: 0,
      documents: 0,
      payments: 0,
      missions: 0,
    });

    await spaceService.delete(db, 'user-1', 'space-a');

    expect(outsideTransaction).toEqual([]);
  });

  it('refuses to delete a space that still holds rows', async () => {
    const db = dbWithSpaceContents({ clients: 0, documents: 2, payments: 0, missions: 0 });

    expect(await trpcErrorOf(() => spaceService.delete(db, 'user-1', 'space-a'))).toEqual({
      code: 'CONFLICT',
      message: 'Cannot delete a space that still holds 2 clients, documents, payments or missions',
    });
  });

  it('deletes an empty space', async () => {
    const db = dbWithSpaceContents({ clients: 0, documents: 0, payments: 0, missions: 0 });

    expect(await spaceService.delete(db, 'user-1', 'space-a')).toEqual({ success: true });
  });
});

describe('spaceService owner protection', () => {
  function ownerDb(updates: unknown[]) {
    return {
      spaceMember: {
        findUnique: async () => ({ role: 'OWNER' }),
        update: async (args: unknown) => {
          updates.push(args);
          return {};
        },
      },
    } as unknown as PrismaClient;
  }

  it('refuses an owner demoting themselves', async () => {
    const updates: unknown[] = [];

    await expect(
      spaceService.updateMemberRole(ownerDb(updates), 'owner-1', {
        spaceId: 'space-1',
        userId: 'owner-1',
        role: 'MEMBER',
      })
    ).rejects.toThrow("Cannot change the owner's role");
    expect(updates).toHaveLength(0);
  });

  it('refuses the owner leaving the space', async () => {
    await expect(spaceService.leave(ownerDb([]), 'owner-1', 'space-1')).rejects.toThrow(
      'Owner cannot leave the space'
    );
  });
});
