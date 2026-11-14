import type { PrismaClient } from '@repo/database';

/**
 * Gives a staff account that belongs to no space a first, empty space it owns,
 * so a brand-new Facile account can start working at once. Registre creates no
 * space at sign-up, and the directory sync only mirrors spaces Registre has.
 * The space is local (no registreSpaceId): the sync never touches it, and it
 * is linked only when its owner later creates a Registre space of the same
 * name. A per-user lock keeps two concurrent sign-ins from creating two.
 * Returns the new space id, or null when the user already had a space.
 */
export async function ensureFirstSpace(
  db: PrismaClient,
  user: { id: string; firstName: string; lastName: string; email: string }
): Promise<string | null> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ardoise.first-space:${user.id}`}))`;
    if ((await tx.spaceMember.count({ where: { userId: user.id } })) > 0) return null;
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0] || 'Mon espace';
    const space = await tx.space.create({
      data: { name, members: { create: { userId: user.id, role: 'OWNER' } } },
      select: { id: true },
    });
    return space.id;
  });
}
