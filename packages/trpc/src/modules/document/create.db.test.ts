import { afterAll, beforeAll, beforeEach, describe, expect, it, setDefaultTimeout } from 'bun:test';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { appRouter } from '../../index';

setDefaultTimeout(120_000);

const enabled = !!process.env.TEST_DATABASE_URL;
process.env.ENCRYPTION_SECRET ??= 'create-test-encryption-secret-0123456789';

const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };
const uploads: string[] = [];
const deletes: string[] = [];
const storage = {
  upload: async (key: string) => {
    uploads.push(key);
    return key;
  },
  getFileUrl: (key: string) => `http://api.test/storage/${key}`,
  delete: async (key: string) => {
    deletes.push(key);
    return true;
  },
};

const year = new Date().getFullYear();
const items = [{ description: 'Site', quantity: 1, unit: 'forfait', price: 1000 }];
const dates = { invoice_date: '2026-11-10', due_date: '2026-12-10' };

describe.skipIf(!enabled)('document create routes against Postgres', () => {
  const ids = { user: '', space: '', provider: '', client: '', mission: '' };
  let release: () => Promise<void> = async () => {};
  let caller: ReturnType<typeof appRouter.createCaller>;

  const wipe = () =>
    prisma.$executeRawUnsafe('TRUNCATE "User", "Space", "Client", "Provider", "Mission", "Document" CASCADE');

  const parties = () => ({ clientId: ids.client, providerId: ids.provider });

  const appel = (ref: string) =>
    caller.document.createAppelDeFonds({
      ...parties(),
      ...dates,
      global_invoice_ref: ref,
      project_step: 'Etape 1',
      project_name: 'Projet',
      payment_providers: [{ id: ids.provider, amount_to_pay: 500 }],
    });

  const invoice = () => caller.document.createFacturePrestation({ ...parties(), ...dates, items });

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
  }, 600_000);

  beforeEach(async () => {
    await wipe();
    uploads.length = 0;
    deletes.length = 0;
    const user = await prisma.user.create({
      data: { email: 'owner@create.test', firstName: 'O', lastName: 'W', role: 'MEMBER' },
    });
    const space = await prisma.space.create({
      data: { name: 'S', members: { create: { userId: user.id, role: 'OWNER' } } },
    });
    const provider = await prisma.provider.create({
      data: {
        name: 'Facile',
        email: 'p@create.test',
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
      data: { contactFirstName: 'C', contactLastName: 'L', companyName: 'Acme', contactEmail: 'c@create.test', spaceId: space.id },
    });
    const mission = await prisma.mission.create({
      data: { name: 'M', status: 'ACCEPTED', clientId: client.id, spaceId: space.id },
    });
    Object.assign(ids, { user: user.id, space: space.id, provider: provider.id, client: client.id, mission: mission.id });

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
  }, 120_000);

  afterAll(async () => {
    await wipe();
    await release();
  }, 120_000);

  it('lets an invoice take a number an appel de fonds already uses as its reference', async () => {
    await appel(`FAC-${year}-001`);

    const { document } = await invoice();

    expect(document.invoiceNumber).toBe(`FAC-${year}-001`);
    await expect(appel(`FAC-${year}-001`)).rejects.toThrow();
  });

  it('does not jump the invoice sequence past an appel de fonds reference after a conflict', async () => {
    await prisma.document.create({
      data: {
        type: 'facture_prestation',
        name: 'f.pdf',
        invoiceNumber: `FAC-${year}-001`,
        items,
        subtotal: 1000,
        tva: 200,
        total: 1200,
        clientName: 'Acme',
        providerName: 'Facile',
        providerId: ids.provider,
        createdBy: ids.user,
        spaceId: ids.space,
      },
    });
    await appel(`FAC-${year}-900`);

    const { document } = await invoice();

    expect(document.invoiceNumber).toBe(`FAC-${year}-002`);
  });

  it('removes the stored pdf of a contract or appel de fonds whose insert fails', async () => {
    const contract = { ...parties(), contract_reference: 'C-1', contract_date: '2026-11-10' };
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Document" ADD CONSTRAINT "test_reject_insert" CHECK (type::text NOT IN ('contrat_prestation', 'contrat_maintenance', 'back_contractuel', 'appel_de_fonds')) NOT VALID`
    );
    try {
      const attempts = [
        () => caller.document.createContratPrestation(contract),
        () => caller.document.createContratMaintenance({ ...contract, maintenance_period: '12 mois' }),
        () =>
          caller.document.createBackContractuel({
            ...contract,
            project_name: 'Projet',
            valid_until: '2026-12-10',
            providers: [{ id: ids.provider, role: 'Dev', amount: 100 }],
          }),
        () => appel('ADF-001'),
      ];
      for (const attempt of attempts) await expect(attempt()).rejects.toThrow();
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "Document" DROP CONSTRAINT "test_reject_insert"');
    }

    expect(uploads).toHaveLength(4);
    expect(deletes.sort()).toEqual([...uploads].sort());
  });

  it('links every prestation invoice to its mission through the missionId column', async () => {
    const event = { event_date: 'd', event_time: 't', event_location: 'l', service_duration: 's', bar_setup_type: 'b' };
    const shoot = { shoot_date: 'd', shoot_time: 't', shoot_location: 'l', shoot_duration: 's' };
    const training = { training_date: 'd', training_time: 't', training_location: 'l', training_duration: 's', training_topic: 'x' };
    const site = { site_address: 'a', site_name: 'n', work_start_date: 'd', work_type: 'w' };
    const base = { ...parties(), ...dates, items, missionId: ids.mission };
    const created = [
      await caller.document.createPrestationBarman({ ...base, ...event }),
      await caller.document.createPrestationPhoto({ ...base, ...shoot, shoot_type: 'p' }),
      await caller.document.createPrestationVideo({ ...base, ...shoot, video_type: 'v' }),
      await caller.document.createPrestationDesign({ ...base, project_name: 'p', project_type: 't', delivery_date: 'd' }),
      await caller.document.createPrestationDev({ ...base, project_name: 'p', tech_stack: 't', delivery_date: 'd' }),
      await caller.document.createPrestationFormation({ ...base, ...training }),
      await caller.document.createPrestationBtp({ ...base, ...site }),
    ];

    for (const { document } of created) {
      expect(document.missionId).toBe(ids.mission);
      expect(document.serviceData).not.toHaveProperty('missionId');
    }
  });
});
