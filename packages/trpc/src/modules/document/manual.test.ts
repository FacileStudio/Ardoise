import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { documentRouter } from './router';

const pdf = new TextEncoder().encode('%PDF-1.7 body');

function setup(overrides: {
    document?: Record<string, unknown>;
    db?: Record<string, unknown>;
    env?: Record<string, unknown>;
  } = {}) {
  const created: any[] = [];
  const updated: any[] = [];
  const deleted: string[] = [];
  const uploads: string[] = [];
  const document = {
    id: 'doc-1',
    type: 'facture_prestation',
    name: 'f.pdf',
    spaceId: 'space-a',
    source: 'generated',
    invoiceNumber: 'F-1',
    quoteNumber: null,
    contractRef: null,
    tvaRate: 20,
    items: [{ description: 'a', quantity: 1, unit: 'j', price: 100 }],
    pdfUrl: 'http://api/storage/documents/doc-1.pdf',
    signatureStatus: 'none',
    ...overrides.document,
  };
  const db: any = {
    document: {
      findUnique: async () => document,
      findFirst: async () => null,
      count: async () => 0,
      create: async (args: any) => {
        created.push(args.data);
        return { ...args.data, payments: [] };
      },
      update: async (args: any) => {
        updated.push(args.data);
        return { ...document, ...args.data };
      },
      delete: async () => ({}),
    },
    payment: { count: async () => 0 },
    client: {
      findFirst: async () => ({ id: 'c-1', companyName: 'Acme', siret: '123', spaceId: 'space-a' }),
    },
    provider: {
      findFirst: async () => ({ id: 'p-1', name: 'Studio', tvaRate: 20 }),
    },
    space: { findUnique: async () => ({ platformStudio: true }) },
    mission: { findFirst: async () => ({ id: 'm-1', status: 'ACCEPTED' }) },
    settings: { findFirst: async () => ({ id: 'global' }), findUnique: async () => ({ id: 'global' }) },
    spaceSettings: { findUnique: async () => null },
    spaceMember: { findUnique: async () => ({ role: 'MEMBER' }), findMany: async () => [{ spaceId: 'space-a' }] },
    ...overrides.db,
  };
  const ctx = {
    db: db as PrismaClient,
    user: { id: 'user-1', role: 'MEMBER', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    storage: {
      download: async () => pdf,
      upload: async (key: string) => {
        uploads.push(key);
        return key;
      },
      delete: async (key: string) => {
        deleted.push(key);
        return true;
      },
      getFileUrl: (key: string) => `http://api/storage/${key}`,
    },
    env: overrides.env ?? {},
  } as any;
  return { caller: documentRouter.createCaller(ctx), created, updated, deleted, uploads };
}

const base = {
  pdfKey: 'uploads/user-1/1-old.pdf',
  type: 'facture_prestation' as const,
  number: 'F-2024-001',
  clientId: 'c-1',
  providerId: 'p-1',
  issuedAt: '2024-03-01',
  total: 120,
};

describe('document.import', () => {
  it('stores the pdf as imported and splits a gross total into subtotal and vat', async () => {
    const { caller, created, deleted, uploads } = setup();

    await caller.import(base);

    expect(uploads[0]).toMatch(/^documents\/.+\.pdf$/);
    expect(deleted).toEqual(['uploads/user-1/1-old.pdf']);
    expect(created[0]).toMatchObject({
      source: 'imported',
      invoiceNumber: 'F-2024-001',
      subtotal: 100,
      tva: 20,
      total: 120,
      signatureStatus: 'none',
    });
    expect(created[0].payments).toBeUndefined();
  });

  it('keeps the upload and drops the stored copy when the write fails', async () => {
    const { caller, deleted } = setup({
      db: {
        document: {
          findFirst: async () => null,
          count: async () => 0,
          create: async () => {
            throw new Error('db down');
          },
        },
      },
    });

    await expect(caller.import(base)).rejects.toThrow('db down');
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toMatch(/^documents\//);
  });

  it('creates a paid manual payment for a paid invoice', async () => {
    const { caller, created } = setup();

    await caller.import({ ...base, markPaid: true, paidAt: '2024-03-10' });

    expect(created[0].payments.create).toMatchObject({
      status: 'PAID',
      collectionMethod: 'MANUAL',
      amount: 120,
      clientId: 'c-1',
    });
  });

  it('refuses a key that belongs to another user', async () => {
    const { caller } = setup();

    await expect(caller.import({ ...base, pdfKey: 'uploads/user-2/x.pdf' })).rejects.toThrow(
      'Invalid file key'
    );
  });

  it('refuses a number already used', async () => {
    const { caller } = setup({ db: { document: { findFirst: async () => ({ id: 'x' }) } } });

    await expect(caller.import(base)).rejects.toThrow('already exists');
  });

  it('refuses markPaid on a quote', async () => {
    const { caller } = setup();

    await expect(
      caller.import({ ...base, type: 'devis', markPaid: true })
    ).rejects.toThrow('Only an invoice');
  });
});

describe('document.update', () => {
  it('marks the stored pdf of a generated document stale when its content changes', async () => {
    const { caller, updated, deleted } = setup();

    const result = await caller.update({ id: 'doc-1', tvaRate: 10 });

    expect(result.pdfStale).toBe(true);
    expect(updated[0]).toMatchObject({ tvaRate: 10, pdfUrl: null, pdfHash: null });
    expect(deleted).toEqual(['documents/doc-1.pdf']);
  });

  it('keeps the pdf of an imported document when its fields change', async () => {
    const { caller, updated } = setup({ document: { source: 'imported' } });

    const result = await caller.update({ id: 'doc-1', total: 240 });

    expect(result.pdfStale).toBe(false);
    expect(updated[0].total).toBe(240);
    expect(updated[0].pdfUrl).toBeUndefined();
  });

  it('refuses to change a generated document out for signature', async () => {
    const { caller } = setup({ document: { signatureStatus: 'sent' } });

    await expect(caller.update({ id: 'doc-1', tvaRate: 10 })).rejects.toThrow('out for signature');
  });

  it('renames a generated document without touching its pdf, even when signed', async () => {
    const { caller, updated, deleted } = setup({
      document: { signatureStatus: 'signed', issuedAt: new Date('2024-03-01') },
    });

    const result = await caller.update({
      id: 'doc-1',
      name: 'renamed.pdf',
      number: 'F-9',
      issuedAt: '2024-03-01',
    });

    expect(result.pdfStale).toBe(false);
    expect(updated[0].pdfUrl).toBeUndefined();
    expect(deleted).toEqual([]);
  });

  it('keeps the detailed items when the total is unchanged and only the rate moves', async () => {
    const items = [
      { description: 'a', quantity: 2, unit: 'j', price: 100 },
      { description: 'b', quantity: 1, unit: 'j', price: 50 },
    ];
    const { caller, updated } = setup({
      document: { source: 'imported', items, total: 300, tvaRate: 20 },
    });

    await caller.update({ id: 'doc-1', total: 300, tvaRate: 10 });

    expect(updated[0].items).toEqual(items);
    expect(updated[0].total).toBe(275);
  });

  it('follows the linked manual payment when an imported total changes', async () => {
    const { caller, updated } = setup({ document: { source: 'imported', total: 120 } });

    await caller.update({ id: 'doc-1', total: 240 });

    expect(updated[0].payments.updateMany.data).toEqual({ amount: 240, totalWithFees: 240 });
  });

  it('rejects a fractional VAT rate', async () => {
    const { caller } = setup({ document: { source: 'imported' } });

    await expect(caller.update({ id: 'doc-1', tvaRate: 5.5 })).rejects.toThrow('whole number');
    await expect(caller.import({ ...base, tvaRate: 5.5 })).rejects.toThrow('whole number');
  });

  it('refuses a mission of another client', async () => {
    const { caller } = setup({
      db: {
        mission: { findFirst: async (args: any) => (args.where.clientId === 'c-1' ? null : { id: 'm-9' }) },
        client: { findFirst: async () => ({ id: 'c-1' }), findMany: async () => [{ id: 'c-1' }] },
      },
    });

    await expect(caller.update({ id: 'doc-1', missionId: 'm-9' })).rejects.toThrow('Mission not found');
  });

  it('replaces then clears the pdf', async () => {
    const { caller, updated, deleted } = setup({ document: { source: 'imported' } });

    await caller.update({ id: 'doc-1', pdfKey: 'uploads/user-1/new.pdf' });
    await caller.update({ id: 'doc-1', pdfKey: null });

    expect(updated[0].pdfUrl).toMatch(/documents\//);
    expect(updated[1]).toMatchObject({ pdfUrl: null, fileSize: null });
    expect(deleted).toContain('uploads/user-1/new.pdf');
  });
});

describe('document.setSignature', () => {
  it('sets the status, the date and the signed pdf', async () => {
    const { caller, updated } = setup();

    await caller.setSignature({
      id: 'doc-1',
      status: 'signed',
      signedAt: '2024-04-01',
      signedPdfKey: 'uploads/user-1/signed.pdf',
    });

    expect(updated[0].signatureStatus).toBe('signed');
    expect(updated[0].signedAt).toEqual(new Date('2024-04-01'));
    expect(updated[0].pdfUrl).toMatch(/documents\//);
  });

  it('drops the stored client signing link', async () => {
    const { caller, updated } = setup();

    await caller.setSignature({ id: 'doc-1', status: 'declined' });

    expect(updated[0].plumeClientSignUrl).toBeNull();
  });

  it('clears the date when the status is not signed', async () => {
    const { caller, updated } = setup();

    await caller.setSignature({ id: 'doc-1', status: 'declined', signedAt: '2024-04-01' });

    expect(updated[0].signedAt).toBeNull();
  });

  it('refuses a signed pdf with another status', async () => {
    const { caller } = setup();

    await expect(
      caller.setSignature({ id: 'doc-1', status: 'none', signedPdfKey: 'uploads/user-1/s.pdf' })
    ).rejects.toThrow('signed status');
  });
});

describe('document.delete', () => {
  it('explains which payments block it', async () => {
    const { caller } = setup({ document: { invoiceNumber: null }, db: { payment: { count: async () => 2 } } });

    await expect(caller.delete({ id: 'doc-1' })).rejects.toThrow('2 payment(s)');
  });

  it('removes the document and its stored pdf', async () => {
    const { caller, deleted } = setup({ document: { invoiceNumber: null } });

    await caller.delete({ id: 'doc-1' });

    expect(deleted).toEqual(['documents/doc-1.pdf']);
  });

  it('lets an imported numbered document be deleted', async () => {
    const { caller, deleted } = setup({ document: { invoiceNumber: 'EXT-9', source: 'imported' } });

    await caller.delete({ id: 'doc-1' });

    expect(deleted).toEqual(['documents/doc-1.pdf']);
  });

  it('refuses an issued invoice and asks for a credit note', async () => {
    const { caller, deleted } = setup({ document: { invoiceNumber: 'FAC-001' } });

    await expect(caller.delete({ id: 'doc-1' })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('credit note (avoir)'),
    });
    expect(deleted).toEqual([]);
  });
});

describe('document.refreshSignLink', () => {
  it('fetches the client signing url from Plume and stores it', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      Response.json({
        signers: [{ id: 1, email: 'ada@acme.fr', signing_url: 'https://p.test/share/a' }],
      })) as unknown as typeof fetch;
    try {
      const { caller, updated } = setup({
        document: { plumeDocumentId: '57', plumeClientSignUrl: null, missionId: 'm-1' },
        db: {
          mission: { findUnique: async () => ({ client: { contactEmail: 'ada@acme.fr' } }) },
        },
        env: {
          PLUME_URL: 'https://p.test',
          PLUME_API_TOKEN: 't',
          PLUME_WEBHOOK_SECRET: 'x'.repeat(20),
        },
      });

      const result = await caller.refreshSignLink({ id: 'doc-1' });

      expect(result.url).toBe('https://p.test/share/a');
      expect(updated[0]).toEqual({ plumeClientSignUrl: 'https://p.test/share/a' });
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('answers null when Plume is not configured', async () => {
    const { caller } = setup({ document: { plumeDocumentId: '57', plumeClientSignUrl: null } });

    expect((await caller.refreshSignLink({ id: 'doc-1' })).url).toBeNull();
  });
});
