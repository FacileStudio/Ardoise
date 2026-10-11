import { describe, expect, it, mock } from 'bun:test';
import type { PrismaClient } from '@repo/database';

mock.module('../document/render', () => ({
  generateDocumentWithLogo: async () => Buffer.from('%PDF-fake'),
}));

const { missionRouter } = await import('./router');

const items = [
  { description: 'Maquettes', quantity: 2, unit: 'jour', price: 500 },
  { description: 'Hébergement', quantity: 1, unit: 'mois', price: 80 },
];
const prestations = items.map((item, position) => ({
  position,
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  unitPrice: item.price,
}));

const quote = (overrides: Record<string, unknown> = {}) => ({
  id: 'q-1',
  version: 1,
  quoteNumber: 'DE-001',
  acceptedAt: null,
  items,
  serviceData: { depositPercent: null },
  ...overrides,
});

interface Setup {
  mission?: Record<string, unknown>;
  prestations?: unknown[];
  quote?: unknown;
  invoices?: unknown[];
}

function setup(options: Setup = {}) {
  const writes = {
    documents: [] as any[],
    documentUpdates: [] as any[],
    missionUpdates: [] as any[],
    uploads: [] as string[],
  };
  const mission = {
    id: 'm-1',
    clientId: 'client-1',
    spaceId: null,
    status: 'DRAFT',
    name: 'Site vitrine',
    depositPercent: null,
    providers: [{ providerId: 'prov-1', role: 'LEAD' }],
    prestations: options.prestations ?? prestations,
    ...options.mission,
  };
  const settings = {
    id: 'global',
    nextInvoiceNumber: 1,
    nextQuoteNumber: 1,
    nextContractNumber: 1,
    invoiceNumberFormat: 'FA-{{number}}',
    quoteNumberFormat: 'DE-{{number}}',
    contractNumberFormat: 'CO-{{number}}',
    defaultPaymentTermsDays: 30,
    webhookUrl: null,
    webhookEvents: [],
  };

  const db: any = {
    $transaction: async (run: unknown) =>
      typeof run === 'function'
        ? (run as (tx: unknown) => unknown)(db)
        : Promise.all(run as unknown[]),
    settings: { findUnique: async () => settings, update: async () => settings },
    mission: {
      findUnique: async () => mission,
      findFirst: async () => ({ id: 'm-1', status: mission.status }),
      updateMany: async (args: any) => writes.missionUpdates.push(args),
    },
    client: { findFirst: async () => ({ id: 'client-1', companyName: 'Acme' }) },
    provider: {
      findFirst: async () => ({ id: 'prov-1', name: 'Facile', tvaRate: 20, logoUrl: null }),
      count: async () => 1,
    },
    prestation: {
      deleteMany: async () => ({}),
      createMany: async (args: any) => {
        mission.prestations = args.data;
        return {};
      },
    },
    document: {
      findFirst: async () => options.quote ?? null,
      findMany: async () => options.invoices ?? [],
      create: async (args: any) => {
        writes.documents.push(args);
        return { id: 'doc-new', ...args.data };
      },
      update: async (args: any) => {
        writes.documentUpdates.push(args);
        return { id: args.where.id, ...args.data };
      },
    },
  };

  const caller = missionRouter.createCaller({
    db: db as PrismaClient,
    user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {
      upload: async (key: string) => {
        writes.uploads.push(key);
        return key;
      },
      getFileUrl: (key: string) => `http://api/storage/${key}`,
    },
    env: {},
  } as any);

  return { caller, writes, mission };
}

describe('missionRouter.setPrestations', () => {
  const line = { description: 'Logo', quantity: 1, unit: 'forfait', unitPrice: 300 };

  it('replaces the lines and keeps their order', async () => {
    const { caller, mission } = setup();

    await caller.setPrestations({
      id: 'm-1',
      prestations: [line, { ...line, description: 'Charte' }],
    });

    expect((mission.prestations as any[]).map((p) => [p.position, p.description])).toEqual([
      [0, 'Logo'],
      [1, 'Charte'],
    ]);
  });

  it('sends the mission back to draft once the lines no longer match the quote', async () => {
    const { caller, writes } = setup({
      mission: { status: 'ACCEPTED' },
      quote: quote({ acceptedAt: new Date() }),
    });

    await caller.setPrestations({ id: 'm-1', prestations: [line] });

    expect(writes.missionUpdates[0]).toEqual({
      where: { id: 'm-1', status: { in: ['QUOTED', 'ACCEPTED'] } },
      data: { status: 'DRAFT' },
    });
  });

  it('refuses a provider that is not linked to the mission', async () => {
    const { caller } = setup();

    await expect(
      caller.setPrestations({ id: 'm-1', prestations: [{ ...line, providerId: 'stranger' }] })
    ).rejects.toThrow('must be linked to the mission');
  });

  it('refuses to edit once the mission is fully invoiced', async () => {
    const { caller } = setup({
      mission: { status: 'INVOICED' },
      quote: quote({ acceptedAt: new Date() }),
      invoices: [{ id: 'i-1', invoiceNumber: 'FA-001', invoiceKind: 'FULL', subtotal: 1080 }],
    });

    await expect(caller.setPrestations({ id: 'm-1', prestations: [line] })).rejects.toThrow(
      'locked once the mission is fully invoiced'
    );
  });

  it('rejects a negative price', async () => {
    const { caller } = setup();

    await expect(
      caller.setPrestations({ id: 'm-1', prestations: [{ ...line, unitPrice: -1 }] })
    ).rejects.toThrow();
  });
});

describe('missionRouter.generateQuote', () => {
  it('refuses a mission with no prestation', async () => {
    const { caller } = setup({ prestations: [] });

    await expect(caller.generateQuote({ id: 'm-1' })).rejects.toThrow(
      'Add at least one prestation'
    );
  });

  it('refuses when the current quote already matches the lines', async () => {
    const { caller } = setup({ mission: { status: 'QUOTED' }, quote: quote() });

    await expect(caller.generateQuote({ id: 'm-1' })).rejects.toThrow('already matches');
  });

  it('refuses a mission without a provider to issue it', async () => {
    const { caller } = setup({ mission: { providers: [] } });

    await expect(caller.generateQuote({ id: 'm-1' })).rejects.toThrow('Link a provider');
  });

  it('stores version 1 with the lines, the totals and the pdf, and quotes the mission', async () => {
    const { caller, writes } = setup({ mission: { depositPercent: 30 } });

    await caller.generateQuote({ id: 'm-1' });

    const data = writes.documents[0].data;

    expect(data.type).toBe('devis');
    expect(data.version).toBe(1);
    expect(data.quoteNumber).toBe('DE-001');
    expect(data.missionId).toBe('m-1');
    expect(data.items).toEqual(items);
    expect([data.subtotal, data.tva, data.total]).toEqual([1080, 216, 1296]);
    expect(data.serviceData).toEqual({ depositPercent: 30 });
    expect(data.pdfUrl).toContain('/storage/documents/');
    expect(writes.uploads).toHaveLength(1);
    expect(writes.missionUpdates[0]).toEqual({
      where: { id: 'm-1', status: { in: ['DRAFT', 'QUOTED', 'ACCEPTED'] } },
      data: { status: 'QUOTED' },
    });
  });

  it('numbers the next version after the lines change', async () => {
    const { caller, writes } = setup({
      mission: { status: 'DRAFT' },
      prestations: [
        ...prestations,
        { position: 2, description: 'SEO', quantity: 1, unit: 'forfait', unitPrice: 200 },
      ],
      quote: quote({ version: 3 }),
    });

    await caller.generateQuote({ id: 'm-1' });

    expect(writes.documents[0].data.version).toBe(4);
  });
});

describe('missionRouter.acceptQuote', () => {
  it('accepts the latest quote and moves the mission to accepted', async () => {
    const { caller, writes } = setup({ mission: { status: 'QUOTED' }, quote: quote() });

    await caller.acceptQuote({ id: 'm-1', documentId: 'q-1' });

    expect(writes.documentUpdates[0].where).toEqual({ id: 'q-1' });
    expect(writes.documentUpdates[0].data.acceptedAt).toBeInstanceOf(Date);
    expect(writes.missionUpdates[0]).toEqual({
      where: { id: 'm-1', status: 'QUOTED' },
      data: { status: 'ACCEPTED' },
    });
  });

  it('refuses a quote that is not the latest', async () => {
    const { caller } = setup({
      mission: { status: 'QUOTED' },
      quote: quote({ id: 'q-2', version: 2 }),
    });

    await expect(caller.acceptQuote({ id: 'm-1', documentId: 'q-1' })).rejects.toThrow(
      'Only the latest quote'
    );
  });

  it('refuses a quote the lines have moved away from', async () => {
    const { caller } = setup({
      mission: { status: 'DRAFT' },
      prestations: [{ ...prestations[0], unitPrice: 600 }, prestations[1]],
      quote: quote(),
    });

    await expect(caller.acceptQuote({ id: 'm-1', documentId: 'q-1' })).rejects.toThrow(
      'prestations changed since this quote'
    );
  });

  it('refuses to accept a quote twice', async () => {
    const { caller } = setup({
      mission: { status: 'ACCEPTED' },
      quote: quote({ acceptedAt: new Date() }),
    });

    await expect(caller.acceptQuote({ id: 'm-1', documentId: 'q-1' })).rejects.toThrow(
      'already accepted'
    );
  });
});

describe('missionRouter.generateInvoice', () => {
  const accepted = (overrides: Record<string, unknown> = {}) =>
    quote({ acceptedAt: new Date(), serviceData: { depositPercent: 30 }, ...overrides });

  it('refuses before the quote is accepted', async () => {
    const { caller } = setup({ mission: { status: 'QUOTED', depositPercent: 30 }, quote: quote() });

    await expect(caller.generateInvoice({ id: 'm-1' })).rejects.toThrow('Accept the quote');
  });

  it('bills the whole quote when the mission has no deposit', async () => {
    const { caller, writes } = setup({
      mission: { status: 'ACCEPTED' },
      quote: accepted({ serviceData: { depositPercent: null } }),
    });

    await caller.generateInvoice({ id: 'm-1' });

    const data = writes.documents[0].data;

    expect(data.invoiceKind).toBe('FULL');
    expect(data.sourceQuoteId).toBe('q-1');
    expect(data.invoiceNumber).toBe('FA-001');
    expect(data.items).toEqual(items);
    expect(data.total).toBe(1296);
    expect(data.dueDate).toBeInstanceOf(Date);
    expect(writes.missionUpdates[0]).toEqual({
      where: { id: 'm-1', status: 'ACCEPTED' },
      data: { status: 'INVOICED' },
    });
  });

  it('bills the deposit as a share of the quote excluding tax', async () => {
    const { caller, writes } = setup({
      mission: { status: 'ACCEPTED', depositPercent: 30 },
      quote: accepted(),
    });

    await caller.generateInvoice({ id: 'm-1', kind: 'DEPOSIT' });

    const data = writes.documents[0].data;

    expect(data.invoiceKind).toBe('DEPOSIT');
    expect(data.items).toEqual([
      { description: 'Acompte 30 % – Site vitrine', quantity: 1, unit: 'forfait', price: 324 },
    ]);
    expect([data.subtotal, data.tva, data.total]).toEqual([324, 64.8, 388.8]);
  });

  it('refuses a deposit the mission does not define', async () => {
    const { caller } = setup({
      mission: { status: 'ACCEPTED' },
      quote: accepted({ serviceData: { depositPercent: null } }),
    });

    await expect(caller.generateInvoice({ id: 'm-1', kind: 'DEPOSIT' })).rejects.toThrow(
      'has no deposit'
    );
  });

  it('deducts the deposit already billed from the balance invoice', async () => {
    const { caller, writes } = setup({
      mission: { status: 'INVOICED', depositPercent: 30 },
      quote: accepted(),
      invoices: [{ id: 'i-1', invoiceNumber: 'FA-001', invoiceKind: 'DEPOSIT', subtotal: 324 }],
    });

    await caller.generateInvoice({ id: 'm-1' });

    const data = writes.documents[0].data;

    expect(data.invoiceKind).toBe('BALANCE');
    expect(data.items.at(-1)).toEqual({
      description: 'Acompte déjà facturé (FA-001)',
      quantity: 1,
      unit: 'forfait',
      price: -324,
    });
    expect([data.subtotal, data.tva, data.total]).toEqual([756, 151.2, 907.2]);
  });

  it('refuses a second invoice once the mission is fully invoiced', async () => {
    const { caller } = setup({
      mission: { status: 'INVOICED', depositPercent: 30 },
      quote: accepted(),
      invoices: [{ id: 'i-1', invoiceNumber: 'FA-001', invoiceKind: 'FULL', subtotal: 1080 }],
    });

    await expect(caller.generateInvoice({ id: 'm-1' })).rejects.toThrow('already fully invoiced');
  });

  it('refuses to invoice a quote the lines have moved away from', async () => {
    const { caller } = setup({
      mission: { status: 'ACCEPTED', depositPercent: 30 },
      prestations: [{ ...prestations[0], quantity: 3 }, prestations[1]],
      quote: accepted(),
    });

    await expect(caller.generateInvoice({ id: 'm-1' })).rejects.toThrow(
      'Generate and accept a new quote'
    );
  });
});
