import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { portalRouter } from './router';
import { summarizeTotals } from './service';

const date = (value: string) => new Date(value);

const clientA = { id: 'client-a', userId: 'user-a', spaceId: 'space-a', companyName: 'A', contactFirstName: 'Ada', contactLastName: 'Lee', contactEmail: 'ada@a.test' };
const clientB = { id: 'client-b', userId: 'user-b', spaceId: 'space-a', companyName: 'B', contactFirstName: 'Bob', contactLastName: 'Ray', contactEmail: 'bob@b.test' };

const mentions = (where: unknown, clientId: string) => JSON.stringify(where).includes(`"clientId":"${clientId}"`);

function documentRow(over: Record<string, unknown>) {
  return {
    id: 'doc-1', name: 'Quote', type: 'devis', missionId: 'm-1', mission: { name: 'Site' },
    invoiceNumber: null, quoteNumber: 'D-1', contractRef: null, issuedAt: null,
    createdAt: date('2026-01-10T00:00:00Z'), total: '120.00', signatureStatus: 'none', signedAt: null,
    pdfUrl: null, source: 'generated', plumeDocumentId: null, plumeClientSignUrl: null, ...over,
  };
}

function caller(userId: string, db: Record<string, unknown>) {
  const client = [clientA, clientB].find((c) => c.userId === userId)!;
  return portalRouter.createCaller({
    db: { client: { findUnique: async ({ where }: any) => (where.userId === userId ? client : null) }, ...db } as unknown as PrismaClient,
    user: { id: userId, role: 'CLIENT', email: client.contactEmail },
    env: { ENCRYPTION_SECRET: 's'.repeat(32), BACKEND_URL: 'http://api' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    apiOrigin: 'http://api',
  } as any);
}

const ownedDocuments = (rows: Array<{ owner: string; row: any }>) => ({
  findFirst: async ({ where }: any) =>
    rows.find((r) => r.row.id === where.id && mentions(where, r.owner))?.row ?? null,
  findMany: async ({ where }: any) => rows.filter((r) => mentions(where, r.owner)).map((r) => r.row),
});

describe('portal scoping', () => {
  const rows = [{ owner: 'client-b', row: documentRow({ id: 'doc-b', pdfUrl: 'http://api/storage/x.pdf', signatureStatus: 'sent' }) }];

  it('answers NOT_FOUND for another client document on download and sign', async () => {
    const a = caller('user-a', { document: ownedDocuments(rows) });
    await expect(a.documentDownload({ id: 'doc-b' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(a.signLink({ id: 'doc-b' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lists nothing of another client', async () => {
    const a = caller('user-a', { document: ownedDocuments(rows) });
    expect(await a.documents()).toEqual([]);
  });

  it('refuses a caller with no client record', async () => {
    const orphan = portalRouter.createCaller({
      db: { client: { findUnique: async () => null } },
      user: { id: 'x', role: 'ADMIN', email: 'x@x.test' },
      env: {},
      log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    } as any);
    await expect(orphan.overview()).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('portal.documents', () => {
  it('only queries client-visible types and drops hidden type filters', async () => {
    const seen: any[] = [];
    const a = caller('user-a', { document: { findMany: async (args: any) => (seen.push(args.where), []) } });

    expect(await a.documents({ type: 'prestation_dev' })).toEqual([]);
    expect(seen.length).toBe(0);

    await a.documents({ type: 'devis' });
    expect(seen[0].type).toBe('devis');
    await a.documents();
    expect(seen[1].type.in).not.toContain('prestation_dev');
    expect(seen[1].type.in).toContain('facture_prestation');
  });

  it('maps rows with issuedAt falling back to createdAt', async () => {
    const a = caller('user-a', {
      document: ownedDocuments([{ owner: 'client-a', row: documentRow({ pdfUrl: 'k' }) }]),
    });
    const [doc] = await a.documents();
    expect(doc).toMatchObject({
      number: 'D-1', total: 120, issuedAt: '2026-01-10T00:00:00.000Z',
      typeLabelKey: 'portal.documentTypes.devis', canDownload: true, source: 'generated',
    });
  });
});

describe('portal.overview totals and missions', () => {
  it('sums billed, paid, due and overdue in cents', () => {
    const now = date('2026-06-01T00:00:00Z');
    const totals = summarizeTotals(
      [
        { status: 'PAID', amount: '0.10', dueDate: date('2026-01-01') },
        { status: 'PAID', amount: '0.20', dueDate: date('2026-01-01') },
        { status: 'PENDING', amount: '100.00', dueDate: date('2026-07-01') },
        { status: 'PENDING', amount: '50.50', dueDate: date('2026-05-01') },
        { status: 'PAST_DUE', amount: '10.00', dueDate: date('2026-08-01') },
        { status: 'CANCELLED', amount: '999.00', dueDate: date('2026-05-01') },
      ],
      now
    );
    expect(totals).toEqual({ billed: 160.8, paid: 0.3, due: 160.5, overdue: 60.5, currency: 'EUR' });
  });

  it('prices a mission from its lines with the lead provider VAT and derives paid and due', async () => {
    const a = caller('user-a', {
      mission: {
        findMany: async () => [
          {
            id: 'm-1', name: 'Site', status: 'ACCEPTED', description: null,
            prestations: [
              { description: 'a', quantity: '2', unit: 'jour', unitPrice: '100.00' },
              { description: 'b', quantity: '1', unit: 'forfait', unitPrice: '50.00' },
            ],
            providers: [{ role: 'LEAD', provider: { tvaRate: 10 } }],
          },
        ],
      },
      payment: {
        findMany: async () => [
          { id: 'p-1', missionId: 'm-1', status: 'PAID', amount: '100.00', dueDate: date('2026-01-01'), collectionMethod: 'STRIPE', description: 'x' },
          { id: 'p-2', missionId: 'm-1', status: 'PENDING', amount: '65.00', dueDate: date('2099-01-01'), collectionMethod: 'STRIPE', description: 'Balance' },
        ],
      },
      document: {
        findMany: async () => [
          documentRow({ id: 'd-1', signatureStatus: 'sent' }),
          documentRow({ id: 'd-2', missionId: 'other' }),
        ],
      },
    });
    const result = await a.overview();

    expect(result.missions[0]).toMatchObject({
      price: 275, paid: 100, due: 175, nextDueDate: '2099-01-01T00:00:00.000Z',
      documentCount: 1, pendingSignatureCount: 1,
    });
    expect(result.actionRequired.map((x) => x.kind)).toEqual(['pay', 'sign']);
    expect(result.totals.billed).toBe(165);
  });
});

describe('portal.signLink', () => {
  it('refuses a document that is not sent', async () => {
    const a = caller('user-a', {
      document: ownedDocuments([{ owner: 'client-a', row: documentRow({ signatureStatus: 'signed' }) }]),
    });
    await expect(a.signLink({ id: 'doc-1' })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('returns the stored client link without calling Plume', async () => {
    const a = caller('user-a', {
      document: ownedDocuments([
        { owner: 'client-a', row: documentRow({ signatureStatus: 'sent', plumeClientSignUrl: 'https://plume/share/t' }) },
      ]),
    });
    expect(await a.signLink({ id: 'doc-1' })).toEqual({ url: 'https://plume/share/t' });
  });
});
