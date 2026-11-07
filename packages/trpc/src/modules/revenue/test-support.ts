import { prisma } from '@repo/database';

export const NOW = new Date('2026-11-15T10:00:00Z');
export const at = (iso: string) => new Date(iso);

export const wipe = () =>
  prisma.$executeRawUnsafe(
    'TRUNCATE "User", "Space", "Provider", "Client", "Mission", "Document", "Payment", "AuditLog", "Settings" CASCADE'
  );

export async function seedSpace(key: string, role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER') {
  const user = await prisma.user.create({
    data: { email: `${key}@rev.test`, firstName: key, lastName: 'T', role: 'MEMBER' },
  });
  const space = await prisma.space.create({
    data: { name: `Space ${key}`, members: { create: { userId: user.id, role } } },
  });
  const client = await prisma.client.create({
    data: {
      contactFirstName: 'C',
      contactLastName: key,
      companyName: `Client ${key}`,
      spaceId: space.id,
    },
  });
  return { spaceId: space.id, clientId: client.id, userId: user.id };
}

export type Seed = Awaited<ReturnType<typeof seedSpace>>;

export const payment = (seed: Seed, data: Record<string, unknown>) =>
  prisma.payment.create({
    data: {
      clientId: seed.clientId,
      spaceId: seed.spaceId,
      amount: 0,
      totalWithFees: 0,
      description: 'p',
      dueDate: at('2026-12-01T00:00:00Z'),
      status: 'PENDING',
      collectionMethod: 'MANUAL',
      ...data,
    } as never,
  });

export const mission = (seed: Seed, name: string, status = 'ACCEPTED') =>
  prisma.mission.create({
    data: { name, status: status as never, clientId: seed.clientId, spaceId: seed.spaceId },
  });

export const document = (seed: Seed, data: Record<string, unknown>) =>
  prisma.document.create({
    data: {
      name: 'd.pdf',
      clientName: 'Client',
      providerName: 'Provider',
      items: [],
      subtotal: 0,
      tva: 0,
      total: 0,
      createdBy: seed.userId,
      spaceId: seed.spaceId,
      ...data,
    } as never,
  });

export const quote = (seed: Seed, missionId: string, version: number, total: number, extra = {}) =>
  document(seed, { type: 'devis', missionId, version, total, subtotal: total, ...extra });

export const accepted = { acceptedAt: at('2026-05-01T00:00:00Z') };

export const invoice = (
  seed: Seed,
  number: string,
  total: number,
  extra: Record<string, unknown> = {}
) =>
  document(seed, {
    type: 'facture_prestation',
    invoiceNumber: number,
    total,
    subtotal: total,
    ...extra,
  });
