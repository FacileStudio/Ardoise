import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { adminProcedure } from '../../trpc';
import { cachedDirectory, type DirectoryView } from './state';

/** Parses a comma-separated env list: trimmed, empty entries dropped, lowercased when `lower`. */
export function parseList(raw: string | undefined, lower = false): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((entry) => (lower ? entry.trim().toLowerCase() : entry.trim()))
      .filter(Boolean)
  );
}

/** Parses BILLING_STAFF_EMAILS: comma-separated, trimmed, lowercased; empty means nobody. */
export function parseStaffEmails(raw: string | undefined): Set<string> {
  return parseList(raw, true);
}

/** The env the staff gate reads. */
export interface StaffEnv {
  OIDC_ISSUER?: string;
  BILLING_STAFF_SUBS?: string;
  BILLING_STAFF_EMAILS?: string;
}

/**
 * Whether a user is billing staff. Nothing the user or another admin can
 * edit counts: the user is read back from the database, must be an active,
 * unbanned ADMIN, and must hold a Facile SSO identity (Account with
 * providerId = OIDC_ISSUER) whose Registre subject is listed in
 * BILLING_STAFF_SUBS. As a fallback, BILLING_STAFF_EMAILS matches the email
 * Registre's snapshot holds for that subject, and only when the snapshot
 * marks it verified. User.email is never consulted.
 */
export async function isBillingStaff(
  db: PrismaClient,
  userId: string,
  env: StaffEnv,
  directory: () => Promise<DirectoryView> | null = cachedDirectory
): Promise<boolean> {
  const subs = parseList(env.BILLING_STAFF_SUBS);
  const emails = parseStaffEmails(env.BILLING_STAFF_EMAILS);
  if (!env.OIDC_ISSUER || (subs.size === 0 && emails.size === 0)) return false;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      isBanned: true,
      accounts: { where: { providerId: env.OIDC_ISSUER }, select: { accountId: true } },
    },
  });
  if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE' || user.isBanned) return false;
  const sub = user.accounts[0]?.accountId;
  if (!sub) return false;
  if (subs.has(sub)) return true;
  if (emails.size === 0) return false;
  const snapshot = await directory()?.catch(() => null);
  return !!snapshot?.spaces.some((space) =>
    space.members.some(
      (member) => member.sub === sub && member.email_verified === true && emails.has(member.email.toLowerCase())
    )
  );
}

/** Admin procedure restricted to billing staff; every billing procedure goes through it. */
export const billingStaffProcedure = adminProcedure.use(async ({ ctx, next }) => {
  if (!(await isBillingStaff(ctx.db, ctx.user.id, ctx.env))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé à l’équipe Facile Studio.' });
  }
  return next();
});
