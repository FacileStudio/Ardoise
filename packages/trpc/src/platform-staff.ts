import type { PrismaClient } from '@repo/database';
import { cachedDirectory, type DirectoryView } from './modules/billing/state';

/** Parses a comma-separated env list: trimmed, empty entries dropped, lowercased when `lower`. */
export function parseList(raw: string | undefined, lower = false): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((entry) => (lower ? entry.trim().toLowerCase() : entry.trim()))
      .filter(Boolean)
  );
}

/** Parses a staff email list: comma-separated, trimmed, lowercased; empty means nobody. */
export function parseStaffEmails(raw: string | undefined): Set<string> {
  return parseList(raw, true);
}

/**
 * The env the staff gate reads. BILLING_STAFF_SUBS and BILLING_STAFF_EMAILS
 * are deprecated aliases, merged with the PLATFORM_* lists.
 */
export interface StaffEnv {
  OIDC_ISSUER?: string;
  PLATFORM_STAFF_SUBS?: string;
  PLATFORM_STAFF_EMAILS?: string;
  BILLING_STAFF_SUBS?: string;
  BILLING_STAFF_EMAILS?: string;
}

/** The staff subjects and emails, PLATFORM_* merged with the deprecated BILLING_* aliases. */
export function staffLists(env: StaffEnv): { subs: Set<string>; emails: Set<string> } {
  return {
    subs: parseList(`${env.PLATFORM_STAFF_SUBS ?? ''},${env.BILLING_STAFF_SUBS ?? ''}`),
    emails: parseStaffEmails(`${env.PLATFORM_STAFF_EMAILS ?? ''},${env.BILLING_STAFF_EMAILS ?? ''}`),
  };
}

/**
 * Whether a user is platform staff: the operators who hold the platform
 * settings (Stripe, SMTP), the generic admin engine, audit logs, the billing
 * backoffice and the shared providers. Nothing the user or another member can
 * edit counts: the user is read back from the database, must be an active,
 * unbanned, non-client account, and must hold a Facile SSO identity (Account
 * with providerId = OIDC_ISSUER) whose Registre subject is listed in
 * PLATFORM_STAFF_SUBS. As a fallback, PLATFORM_STAFF_EMAILS matches the email
 * Registre's snapshot holds for that subject, and only when the snapshot marks
 * it verified. User.email and User.role never grant anything here.
 */
export async function isPlatformStaff(
  db: PrismaClient,
  userId: string,
  env: StaffEnv,
  directory: () => Promise<DirectoryView> | null = cachedDirectory
): Promise<boolean> {
  const { subs, emails } = staffLists(env);
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
  if (!user || user.role === 'CLIENT' || user.status !== 'ACTIVE' || user.isBanned) return false;
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
