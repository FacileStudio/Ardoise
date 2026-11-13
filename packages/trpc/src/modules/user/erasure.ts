import type { Prisma, PrismaClient } from '@repo/database';

/**
 * Ardoise's answer to an erasure, from a Registre notice or from a client
 * deleting their own portal account: it anonymises, it never deletes.
 * Invoices, quotes, credit notes, contracts and payments are legal and fiscal
 * records Ardoise must keep unchanged, and `Document.createdBy` cascades from
 * `User`, so the account stays as a tombstone with every personal field
 * replaced. What goes is the person's own account: identities, sessions,
 * magic links, memberships, pending invitations, avatar files, personal
 * comps and overrides, and their trace in audit rows. `docs/erasure.md` lists
 * every field and why.
 */

type Tx = Prisma.TransactionClient;

/** One advisory lock for every erasure, so two pollers or a push and a poll never interleave. */
const ERASURE_LOCK = 724_300_131;

/** The first name every anonymised account carries. */
export const ERASED_FIRST_NAME = 'Compte';

/** The last name every anonymised account carries. */
export const ERASED_LAST_NAME = 'supprimé';

/** The unique, non-identifying email of an anonymised account. */
export const erasedEmail = (userId: string) => `erased-${userId}@erased.invalid`;

/** `erased`: a person Ardoise knew was anonymised. `unknown`: Ardoise holds nothing keyed on that subject. */
export type ErasureOutcome = { status: 'erased'; users: number } | { status: 'unknown' };

/** Who to erase: a Registre subject (through its identity rows) or one local account by id. */
export type ErasureTarget = { subject: string } | { userId: string };

/** What an erasure needs. `removeFile` deletes one storage key; it runs before the transaction. */
export interface ErasureDeps {
  db: PrismaClient;
  issuer: string;
  removeFile?: (key: string) => Promise<unknown>;
}

/** Both spellings of the issuer an identity row may carry. */
export function issuerSpellings(issuer: string): string[] {
  const bare = issuer.replace(/\/+$/, '');
  return [bare, `${bare}/`];
}

const PERSON = { id: true, email: true, firstName: true, lastName: true } as const;

/** The users a target names, with every identity subject the erasure must scrub. */
async function resolveTarget(db: PrismaClient | Tx, issuer: string, target: ErasureTarget) {
  if ('subject' in target) {
    const accounts = await db.account.findMany({
      where: { providerId: { in: issuerSpellings(issuer) }, accountId: target.subject },
      select: { user: { select: PERSON } },
    });
    const users = [...new Map(accounts.map(({ user }) => [user.id, user])).values()];
    return { users, subjects: [target.subject] };
  }
  const user = await db.user.findFirst({
    where: { id: target.userId, anonymizedAt: null },
    select: { ...PERSON, accounts: { select: { accountId: true } } },
  });
  if (!user) return { users: [], subjects: [] };
  const { accounts, ...person } = user;
  return { users: [person], subjects: accounts.map((account) => account.accountId) };
}

/** Replaces one exact JSON string value in every audit row, optionally only those about one entity. */
async function scrubAudit(tx: Tx, value: string, placeholder: string, entityId?: string) {
  if (!value.trim()) return;
  const needle = JSON.stringify(value);
  const replacement = JSON.stringify(placeholder);
  await tx.$executeRaw`
    UPDATE "AuditLog" SET "changes" = replace("changes"::text, ${needle}, ${replacement})::jsonb
    WHERE "changes" IS NOT NULL AND strpos("changes"::text, ${needle}) > 0
      AND (${entityId ?? null}::text IS NULL OR "entityId" = ${entityId ?? null}::text)`;
}

/** Anonymises one account in place and removes everything that belongs only to it. */
async function anonymise(
  tx: Tx,
  user: { id: string; email: string; firstName: string; lastName: string },
  subjects: string[]
) {
  const placeholder = erasedEmail(user.id);
  const emails = [...new Set([user.email, user.email.toLowerCase()])];
  await tx.session.deleteMany({ where: { userId: user.id } });
  await tx.magicLink.deleteMany({ where: { userId: user.id } });
  await tx.account.deleteMany({ where: { userId: user.id } });
  await tx.adminPermission.deleteMany({ where: { userId: user.id } });
  await tx.spaceMember.deleteMany({ where: { userId: user.id } });
  await tx.invitation.deleteMany({
    where: {
      OR: [{ invitedById: user.id }, { email: { equals: user.email, mode: 'insensitive' } }],
    },
  });
  await tx.media.deleteMany({
    where: { OR: [{ avatarUserId: user.id }, { coverUserId: user.id }] },
  });
  await tx.auditLog.updateMany({
    where: { userId: user.id },
    data: { ipAddress: null, userAgent: null },
  });
  for (const email of emails) await scrubAudit(tx, email, placeholder);
  for (const subject of subjects) await scrubAudit(tx, subject, 'erased');
  await scrubAudit(tx, user.firstName, ERASED_FIRST_NAME, user.id);
  await scrubAudit(tx, user.lastName, ERASED_LAST_NAME, user.id);
  const createdBy = { createdBy: { equals: user.email, mode: 'insensitive' as const } };
  await tx.entitlementOverride.updateMany({ where: createdBy, data: { createdBy: placeholder } });
  await tx.compedSpace.updateMany({ where: createdBy, data: { createdBy: placeholder } });
  await tx.user.update({
    where: { id: user.id },
    data: {
      email: placeholder,
      firstName: ERASED_FIRST_NAME,
      lastName: ERASED_LAST_NAME,
      password: null,
      emailVerified: false,
      banReason: null,
      bannedAt: null,
      suspensionReason: null,
      lastLoginAt: null,
      lastLoginIp: null,
      ssoPictureUrl: null,
      profileSyncedAt: null,
      anonymizedAt: new Date(),
    },
  });
}

/** Deletes the person's own comps and overrides, matched by subject or by the account's email. */
async function dropPersonalBilling(tx: Tx, subjects: string[], emails: string[]) {
  const lower = emails.map((email) => email.toLowerCase());
  const comps = await tx.compedPerson.deleteMany({
    where: { OR: [{ registreSub: { in: subjects } }, { email: { in: lower } }] },
  });
  const overrides = await tx.entitlementOverride.deleteMany({
    where: {
      scope: 'person',
      OR: [{ personSub: { in: subjects } }, { personEmail: { in: lower } }],
    },
  });
  return comps.count + overrides.count;
}

/**
 * Erases `target` in one transaction and says whether Ardoise knew them.
 * Idempotent: once anonymised the identity row is gone and the account is
 * marked, so a second call finds nothing and answers `unknown` without
 * writing. Avatar files go first, outside the transaction, so a failed
 * transaction is simply retried by the next notice, poll or request.
 */
export async function erasePerson(
  deps: ErasureDeps,
  target: ErasureTarget
): Promise<ErasureOutcome> {
  const key = 'subject' in target ? target.subject : target.userId;
  if (!key.trim()) throw new Error('erasure: empty target');
  const { users: known } = await resolveTarget(deps.db, deps.issuer, target);
  if (deps.removeFile && known.length > 0) {
    const media = await deps.db.media.findMany({
      where: { OR: known.flatMap((user) => [{ avatarUserId: user.id }, { coverUserId: user.id }]) },
      select: { key: true },
    });
    for (const { key } of media) await deps.removeFile(key);
  }
  return deps.db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ERASURE_LOCK})`;
      const { users, subjects } = await resolveTarget(tx, deps.issuer, target);
      const billing = await dropPersonalBilling(
        tx,
        subjects,
        users.map((user) => user.email)
      );
      for (const user of users) await anonymise(tx, user, subjects);
      if (users.length === 0 && billing === 0) return { status: 'unknown' } as const;
      return { status: 'erased', users: users.length } as const;
    },
    { maxWait: 10_000, timeout: 60_000 }
  );
}
