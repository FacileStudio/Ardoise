import { rm } from 'node:fs/promises';
import * as path from 'node:path';
import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';
import { StorageService } from '@repo/storage';
import { appRouter } from '@repo/trpc';
import {
  ADMIN,
  CLIENTS,
  MISSIONS,
  PASSWORD,
  PROVIDERS,
  SETTINGS,
  type Line,
  type MissionSeed,
} from './seed-data';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The seed wipes business data and must not run in production');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const BACKEND_DIR = path.resolve(import.meta.dir, '../../../apps/backend');
const storagePath = path.resolve(BACKEND_DIR, process.env.STORAGE_PATH ?? './data/uploads');
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

const authManager = new AuthManager({
  encryptionSecret: process.env.ENCRYPTION_SECRET ?? 'seed-only-secret-0123456789-0123456789',
});
const storage = new StorageService({ storagePath, publicUrl: backendUrl });

const quiet = () => {};
const log = { debug: quiet, info: quiet, warn: quiet, error: console.error, child: () => log };

// documents, payments and missions go before the rows they point to
async function wipeBusinessData() {
  // every document row goes, so every stored pdf is left without an owner
  await rm(path.join(storagePath, 'documents'), { recursive: true, force: true });
  await prisma.payment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.client.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: '@seed.test' } } });
}

async function seedSettings() {
  await prisma.settings.upsert({
    where: { id: 'global' },
    update: SETTINGS,
    create: { id: 'global', ...SETTINGS },
  });
}

async function seedAdmin() {
  return prisma.user.create({
    data: {
      ...ADMIN,
      password: await authManager.hashPassword(PASSWORD),
      role: 'ADMIN',
      emailVerified: true,
    },
  });
}

async function seedSpace(seedAdminId: string, name: string, description: string) {
  const space = await prisma.space.create({ data: { name, description } });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });

  await prisma.spaceMember.createMany({
    data: admins.map((admin) => ({
      spaceId: space.id,
      userId: admin.id,
      role: admin.id === seedAdminId ? 'OWNER' : 'ADMIN',
    })),
  });

  return space;
}

async function main() {
  console.log('Wiping business data and seeding. Development databases only.');

  await wipeBusinessData();
  await seedSettings();

  const admin = await seedAdmin();
  const studio = await seedSpace(admin.id, 'Studio', 'Espace principal de test');
  const space = await seedSpace(admin.id, 'Atelier Nord', 'Second espace de test');

  const ctx: any = {
    db: prisma,
    user: { id: admin.id, role: 'ADMIN', email: admin.email },
    auth: authManager,
    storage,
    env: {
      FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      MAGIC_LINK_TTL_MINUTES: 15,
      MAGIC_LINK_MAX_PER_EMAIL_HOUR: 5,
      MAGIC_LINK_MAX_PER_IP_HOUR: 20,
    },
    appOrigin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    apiOrigin: backendUrl,
    log,
    getStripe: async () => null,
    getSmtp: async () => null,
  };
  const api = appRouter.createCaller(ctx);

  const clients = new Map<string, string>();
  const providers = new Map<string, string>();

  async function clientId(key: keyof typeof CLIENTS, spaceId: string) {
    const id = `${key}:${spaceId}`;

    if (!clients.has(id)) {
      const { credentialEmail, ...data } = CLIENTS[key] as typeof CLIENTS.acme;
      const client = await api.client.create({
        ...data,
        spaceId,
        createCredentials: !!credentialEmail && spaceId === studio.id,
        credentialEmail,
      } as any);

      clients.set(id, client.id);
    }

    return clients.get(id) as string;
  }

  async function providerId(key: keyof typeof PROVIDERS) {
    if (!providers.has(key)) {
      const provider = await api.provider.create(PROVIDERS[key] as any);

      providers.set(key, provider.id);
    }

    return providers.get(key) as string;
  }

  const prestationsOf = async (lines: Line[]) =>
    Promise.all(
      lines.map(async (line) => ({
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        providerId: line.provider ? await providerId(line.provider) : null,
      }))
    );

  async function play(missionId: string, seed: MissionSeed) {
    let invoiceId = '';

    for (const step of seed.steps) {
      const { billing } = await api.mission.getById({ id: missionId });

      if (step === 'quote') await api.mission.generateQuote({ id: missionId } as any);
      if (step === 'accept') {
        await api.mission.acceptQuote({ id: missionId, documentId: billing.currentQuoteId as string });
      }
      if (step === 'deposit') {
        invoiceId = (await api.mission.generateInvoice({ id: missionId, kind: 'DEPOSIT' } as any)).id;
      }
      if (step === 'invoice') {
        invoiceId = (await api.mission.generateInvoice({ id: missionId, kind: 'TOTAL' } as any)).id;
      }
      if (step === 'pay' || step === 'paid') {
        const payment = await api.mission.createPayment({
          id: missionId,
          documentId: invoiceId,
          collectionMethod: 'MANUAL',
        } as any);

        if (step === 'paid') await api.payment.update({ id: payment.id, status: 'PAID' } as any);
      }
      if (step === 'edit') {
        await api.mission.setPrestations({
          id: missionId,
          prestations: await prestationsOf(seed.editedLines ?? seed.lines),
        } as any);
      }
      if (step === 'cancel') await api.mission.setStatus({ id: missionId, status: 'CANCELLED' });
    }
  }

  for (const seed of MISSIONS) {
    const spaceId = seed.space ? space.id : studio.id;
    const links = await Promise.all(
      seed.providers.map(async ([key, role]) => ({ providerId: await providerId(key), role }))
    );
    const mission = await api.mission.create({
      name: seed.name,
      description: seed.description,
      clientId: await clientId(seed.client, spaceId),
      depositPercent: seed.depositPercent,
      providers: links,
    } as any);

    await api.mission.setPrestations({
      id: mission.id,
      prestations: await prestationsOf(seed.lines),
    } as any);
    await play(mission.id, seed);
    console.log(`  mission ${seed.name}`);
  }

  const missions = await prisma.mission.findMany({ orderBy: { createdAt: 'asc' }, select: { name: true, status: true } });

  console.log('\nSeeded missions:');
  for (const mission of missions) console.log(`  ${mission.status.padEnd(10)} ${mission.name}`);

  console.log(`\nAdmin    ${ADMIN.email} / ${PASSWORD}`);
  console.log(`Client   ${CLIENTS.acme.credentialEmail} (signs in with an emailed link)`);
  console.log(`"Studio" holds every mission but one, which sits in "Atelier Nord".`);
  console.log(`PDFs are stored in ${storagePath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
