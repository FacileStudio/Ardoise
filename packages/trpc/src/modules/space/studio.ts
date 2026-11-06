import { TRPCError } from '@trpc/server';
import type { Prisma, PrismaClient } from '@repo/database';

/**
 * A space marked `platformStudio` belongs to the platform operator's studio.
 * Only such a space may spend platform resources on its clients: the platform
 * Stripe account, SMTP, Plume and Nuage, and the shared (space-less)
 * providers. Platform staff set the flag (space.setPlatformStudio); a space
 * mirrored from Registre starts without it.
 */
export async function isPlatformStudio(db: PrismaClient, spaceId: string): Promise<boolean> {
  const space = await db.space.findUnique({ where: { id: spaceId }, select: { platformStudio: true } });
  return space?.platformStudio === true;
}

/** Refuses with FORBIDDEN unless the space is a platform studio space. */
export async function requirePlatformStudio(db: PrismaClient, spaceId: string): Promise<void> {
  if (!(await isPlatformStudio(db, spaceId))) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Online payments, emails and signatures are not enabled for this space',
    });
  }
}

/** The providers a document, mission or prestation of `spaceId` may use. */
export async function providersOfSpace(db: PrismaClient, spaceId: string): Promise<Prisma.ProviderWhereInput> {
  return (await isPlatformStudio(db, spaceId)) ? { OR: [{ spaceId }, { spaceId: null }] } : { spaceId };
}

/**
 * The providers a user may see: those of their spaces, plus the shared ones
 * when they belong to a platform studio space.
 */
export async function providersOfUser(db: PrismaClient, userId: string): Promise<Prisma.ProviderWhereInput> {
  const memberships = await db.spaceMember.findMany({
    where: { userId },
    select: { spaceId: true, space: { select: { platformStudio: true } } },
  });
  const spaceIds = memberships.map((m) => m.spaceId);
  const shared = memberships.some((m) => m.space.platformStudio);
  return shared ? { OR: [{ spaceId: { in: spaceIds } }, { spaceId: null }] } : { spaceId: { in: spaceIds } };
}
