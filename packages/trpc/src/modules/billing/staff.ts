import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { adminProcedure } from '../../trpc';

/** Parses BILLING_STAFF_EMAILS: comma-separated, trimmed, lowercased; empty means nobody. */
export function parseStaffEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Whether a user is billing staff. The session is not trusted: the user is
 * read back from the database and must be an active, unbanned ADMIN with a
 * verified email listed in BILLING_STAFF_EMAILS. Every SSO sign-in becomes
 * ADMIN, so the ADMIN role alone never grants billing.
 */
export async function isBillingStaff(
  db: PrismaClient,
  userId: string,
  staffEmails: string | undefined
): Promise<boolean> {
  const allowed = parseStaffEmails(staffEmails);
  if (allowed.size === 0) return false;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, emailVerified: true, status: true, isBanned: true },
  });
  if (!user || user.role !== 'ADMIN' || !user.emailVerified) return false;
  if (user.status !== 'ACTIVE' || user.isBanned) return false;
  return allowed.has(user.email.trim().toLowerCase());
}

/** Admin procedure restricted to billing staff; every billing procedure goes through it. */
export const billingStaffProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (!(await isBillingStaff(ctx.db, ctx.user.id, ctx.env.BILLING_STAFF_EMAILS))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé à l’équipe Facile Studio.' });
  }
  return next();
});
