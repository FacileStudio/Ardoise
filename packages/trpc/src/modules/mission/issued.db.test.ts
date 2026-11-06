import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { appRouter } from '../../index';

const enabled = !!process.env.TEST_DATABASE_URL;
process.env.ENCRYPTION_SECRET ??= 'issued-test-encryption-secret-0123456789';

const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };
const storage = {
  upload: async (key: string) => key,
  getFileUrl: (key: string) => `http://api.test/storage/${key}`,
  delete: async () => {},
};

describe.skipIf(!enabled)('issued documents against Postgres', () => {
  const ids: Record<string, string> = {};
  let release: () => Promise<void> = async () => {};
  let caller: ReturnType<typeof appRouter.createCaller>;

  const wipe = () =>
    prisma.$executeRawUnsafe('TRUNCATE "User", "Space", "Client", "Provider", "Mission", "Document" CASCADE');

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await wipe();
    const user = await prisma.user.create({
      data: { email: 'owner@issued.test', firstName: 'O', lastName: 'W', role: 'MEMBER' },
    });
    const space = await prisma.space.create({
      data: { name: 'S', platformStudio: true, members: { create: { userId: user.id, role: 'OWNER' } } },
    });
    const provider = await prisma.provider.create({
      data: {
        name: 'Facile',
        email: 'p@issued.test',
        phone: '0102030405',
        address: '1 rue X',
        city: 'Paris',
        postalCode: '75001',
        siret: '12345678900011',
        bankName: 'Banque',
        iban: 'FR7612345678901234567890123',
        bic: 'ABCDFRPP',
        spaceId: space.id,
      },
    });
    const client = await prisma.client.create({
      data: {
        contactFirstName: 'C',
        contactLastName: 'L',
        companyName: 'Acme',
        contactEmail: 'c@issued.test',
        spaceId: space.id,
      },
    });
    const mission = await prisma.mission.create({
      data: {
        name: 'M',
        status: 'ACCEPTED',
        clientId: client.id,
        spaceId: space.id,
        providers: { create: { providerId: provider.id, role: 'LEAD' } },
        prestations: { create: { description: 'Site', quantity: 1, unit: 'forfait', unitPrice: 1000, position: 0 } },
      },
    });
    const lines = [{ description: 'Site', quantity: 1, unit: 'forfait', price: 1000 }];
    const base = {
      type: 'devis' as const,
      name: 'q.pdf',
      clientName: 'Acme',
      providerName: 'Facile',
      items: lines,
      subtotal: 1000,
      tva: 200,
      total: 1200,
      createdBy: user.id,
      spaceId: space.id,
    };
    await prisma.document.create({
      data: { ...base, quoteNumber: 'DEVIS-1', missionId: mission.id, version: 1, acceptedAt: new Date(), serviceData: { depositPercent: null } },
    });
    const numbered = await prisma.document.create({
      data: { ...base, type: 'facture_prestation', name: 'f.pdf', invoiceNumber: 'FAC-0' },
    });
    const draft = await prisma.document.create({ data: { ...base, type: 'contrat_prestation', name: 'c.pdf' } });
    Object.assign(ids, { mission: mission.id, numbered: numbered.id, draft: draft.id, space: space.id });

    caller = appRouter.createCaller({
      req: new Request('http://api.test'),
      resHeaders: new Headers(),
      user: { id: user.id, role: 'MEMBER', email: user.email },
      db: prisma,
      storage,
      env: { PLATFORM_STAFF_SUBS: '', ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET },
      apiOrigin: 'http://api.test',
      appOrigin: 'http://app.test',
      log: silent,
    } as never);
  }, 600_000);

  afterAll(async () => {
    await wipe();
    await release();
  }, 120_000);

  it('refuses to delete a numbered invoice and points to a credit note', async () => {
    const error = await caller.document.delete({ id: ids.numbered! }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TRPCError);
    expect((error as TRPCError).code).toBe('PRECONDITION_FAILED');
    expect((error as TRPCError).message).toContain('credit note (avoir)');
    expect(await prisma.document.count({ where: { id: ids.numbered } })).toBe(1);
  });

  it('refuses to delete a numbered quote', async () => {
    const quote = await prisma.document.findFirstOrThrow({ where: { quoteNumber: 'DEVIS-1' } });

    await expect(caller.document.delete({ id: quote.id })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('still deletes a document that holds no issued number', async () => {
    await caller.document.delete({ id: ids.draft! });

    expect(await prisma.document.count({ where: { id: ids.draft } })).toBe(0);
  });

  it('lets exactly one of two concurrent generateInvoice calls through', async () => {
    const results = await Promise.allSettled([
      caller.mission.generateInvoice({ id: ids.mission!, kind: 'TOTAL' }),
      caller.mission.generateInvoice({ id: ids.mission!, kind: 'TOTAL' }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(refused.reason).toMatchObject({ code: 'BAD_REQUEST' });
    expect(await prisma.document.count({ where: { missionId: ids.mission, type: 'facture_prestation' } })).toBe(1);
    expect(await prisma.documentCounter.findUnique({ where: { spaceId_kind: { spaceId: ids.space!, kind: 'invoice' } } })).toMatchObject({ next: 2 });
  }, 60_000);
});
