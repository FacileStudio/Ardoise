import type { Prisma, PrismaClient, SpaceRole } from '@repo/database';
import {
  RoleAdmin,
  RoleMember,
  RoleOwner,
  type DirectoryMember,
  type DirectorySpace,
  type ImportSpace,
  type Snapshot,
  type SyncLogger,
} from './directory';

/**
 * Ardoise's half of the suite shared-spaces contract: every `Space` is a
 * shared space (personal work is the space-less scope, never a Space row), its
 * OWNER/ADMIN/MEMBER ladder is Registre's one to one, and a Registre identity
 * is an `Account` row with `providerId` = the issuer and `accountId` = `sub`,
 * exactly what `oidc/identity.ts` writes at sign-in.
 */

type Tx = Prisma.TransactionClient;

const rank: Record<SpaceRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };

/** What Apply and the import need beyond the snapshot itself. */
export interface DirectoryDeps {
  db: PrismaClient;
  issuer: string;
  logger: SyncLogger;
}

/** Maps a Registre role onto Ardoise's; anything unknown is an ordinary member. */
export function toSpaceRole(role: string): SpaceRole {
  if (role === RoleOwner) return 'OWNER';
  if (role === RoleAdmin) return 'ADMIN';
  return 'MEMBER';
}

/** Maps an Ardoise role onto Registre's. */
export function fromSpaceRole(role: SpaceRole): string {
  if (role === 'OWNER') return RoleOwner;
  if (role === 'ADMIN') return RoleAdmin;
  return RoleMember;
}

/** Splits a display name into Ardoise's first and last name, falling back to the email's local part. */
export function splitName(name: string, email: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = (name.trim() || email.split('@')[0] || '').split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}

/**
 * Every unlinked space that has members, ready for Registre's one-time import.
 * A member is sent by their Registre `sub` when Ardoise knows it, by email
 * otherwise.
 */
export async function buildImport(db: PrismaClient, issuer: string): Promise<ImportSpace[]> {
  const spaces = await db.space.findMany({
    where: { registreSpaceId: null },
    select: {
      name: true,
      members: {
        select: {
          role: true,
          user: {
            select: { email: true, accounts: { where: { providerId: issuer }, select: { accountId: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return spaces
    .filter((space) => space.members.length > 0)
    .map((space) => ({
      name: space.name,
      members: space.members.map((member) => {
        const sub = member.user.accounts[0]?.accountId;
        const role = fromSpaceRole(member.role);
        return sub ? { sub, role } : { email: member.user.email, role };
      }),
    }));
}

/**
 * Makes Ardoise's spaces match the snapshot, in one transaction, idempotently.
 * Spaces link by `registreSpaceId`, then by an unlinked space of the same name
 * (case-insensitive), else a space is created. Members resolve by Registre
 * identity, then by verified email, else an SSO-only MEMBER user is
 * pre-provisioned; MEMBER grants nothing beyond the memberships written here.
 * An existing user's role is never changed. Memberships of users with
 * a Registre identity who are absent from the space are removed; local-only
 * users and unlinked spaces are never touched. A linked space missing from the
 * snapshot is left alone and logged; a deleted one arrives with no members.
 */
export async function applySnapshot(deps: DirectoryDeps, snapshot: Snapshot): Promise<void> {
  const orphans = await deps.db.$transaction(
    async (tx) => {
      const seen: string[] = [];
      for (const space of snapshot.spaces) {
        const spaceId = await linkSpace(tx, deps.issuer, space);
        seen.push(spaceId);
        await syncMembers(tx, deps, spaceId, space.members);
      }
      return tx.space.findMany({
        where: { registreSpaceId: { not: null }, id: { notIn: seen } },
        select: { id: true, name: true },
      });
    },
    { maxWait: 10_000, timeout: 60_000 }
  );
  if (orphans.length > 0) {
    deps.logger.warn({ spaces: orphans }, '[REGISTRE] Linked spaces missing from the snapshot were left alone');
  }
}

/**
 * Finds or creates the space mirroring `space` and sets its link and name. An
 * unlinked local space is adopted by name only when it is the one Ardoise
 * itself imported: see `adoptable`. Anything else gets a fresh space, so a
 * Registre space named like someone else's never inherits their clients.
 */
async function linkSpace(tx: Tx, issuer: string, space: DirectorySpace): Promise<string> {
  const select = { id: true, name: true, registreSpaceId: true } as const;
  const candidates = await tx.space.findMany({
    where: { registreSpaceId: null, name: { equals: space.name, mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
    select: {
      ...select,
      members: {
        where: { role: 'OWNER' },
        select: { user: { select: { accounts: { where: { providerId: issuer }, select: { accountId: true } } } } },
      },
    },
  });
  const local =
    (await tx.space.findUnique({ where: { registreSpaceId: space.id }, select })) ??
    candidates.find((candidate) => adoptable(candidate.members, space)) ??
    null;
  if (!local) {
    const created = await tx.space.create({ data: { name: space.name, registreSpaceId: space.id }, select });
    return created.id;
  }
  if (local.name !== space.name || local.registreSpaceId !== space.id) {
    await tx.space.update({ where: { id: local.id }, data: { name: space.name, registreSpaceId: space.id } });
  }
  return local.id;
}

/**
 * Whether an unlinked local space is the one Ardoise imported as `space`: its
 * local owners hold Registre identities, and every one of them owns the
 * Registre space. The import sends every space that has members, so after it
 * the only unlinked spaces left are empty ones, which are never adopted.
 */
export function adoptable(
  owners: Array<{ user: { accounts: Array<{ accountId: string }> } }>,
  space: DirectorySpace
): boolean {
  const subs = owners.flatMap((owner) => owner.user.accounts.map((account) => account.accountId));
  const remote = new Set(space.members.filter((member) => member.role === RoleOwner).map((member) => member.sub));
  return subs.length > 0 && subs.every((sub) => remote.has(sub));
}

/** Makes one space's memberships match Registre's, sparing local-only users. */
async function syncMembers(tx: Tx, deps: DirectoryDeps, spaceId: string, members: DirectoryMember[]) {
  const desired = new Map<string, SpaceRole>();
  for (const member of members) {
    if (!member.sub) continue;
    const userId = await resolveMember(tx, deps, member);
    if (!userId) continue;
    const role = toSpaceRole(member.role);
    const held = desired.get(userId);
    desired.set(userId, held && rank[held] > rank[role] ? held : role);
  }
  const current = await tx.spaceMember.findMany({
    where: { spaceId },
    select: {
      id: true,
      userId: true,
      role: true,
      user: { select: { accounts: { where: { providerId: deps.issuer }, select: { id: true } } } },
    },
  });
  for (const membership of current) {
    const role = desired.get(membership.userId);
    if (role && role !== membership.role) {
      await tx.spaceMember.update({ where: { id: membership.id }, data: { role } });
    } else if (!role && membership.user.accounts.length > 0) {
      await tx.spaceMember.delete({ where: { id: membership.id } });
    }
  }
  const present = new Set(current.map((membership) => membership.userId));
  for (const [userId, role] of desired) {
    if (!present.has(userId)) await tx.spaceMember.create({ data: { spaceId, userId, role } });
  }
}

/**
 * Returns the local user for a snapshot member: by Registre identity, then by
 * email (recording the identity), else a pre-provisioned SSO-only member whose
 * first sign-in lands on the row through the recorded identity. The email
 * match happens only when the snapshot marks the email verified, and never
 * binds a CLIENT row or a user already bound to another subject; those
 * members are skipped and logged. Registre does not send `email_verified`
 * yet, so today an email already used locally is never linked.
 */
async function resolveMember(tx: Tx, deps: DirectoryDeps, member: DirectoryMember): Promise<string | null> {
  const account = await tx.account.findUnique({
    where: { providerId_accountId: { providerId: deps.issuer, accountId: member.sub } },
    select: { userId: true },
  });
  if (account) return account.userId;
  const email = member.email.trim();
  if (!email) return null;
  const existing = await tx.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, role: true },
  });
  if (existing && !(await linkable(tx, deps, existing, member))) return null;
  const userId = existing?.id ?? (await provisionUser(tx, member, email));
  await tx.account.create({
    data: { id: crypto.randomUUID(), userId, providerId: deps.issuer, accountId: member.sub },
  });
  return userId;
}

/** Whether a snapshot member may be bound to an existing local user found by email. */
async function linkable(
  tx: Tx,
  deps: DirectoryDeps,
  user: { id: string; role: string },
  member: DirectoryMember
): Promise<boolean> {
  if (member.email_verified !== true) {
    deps.logger.warn({ sub: member.sub }, '[REGISTRE] Skipped a member whose unverified email matches a local user');
    return false;
  }
  if (user.role === 'CLIENT') {
    deps.logger.warn({ sub: member.sub }, '[REGISTRE] Skipped a member whose email belongs to a client account');
    return false;
  }
  const other = await tx.account.findFirst({ where: { userId: user.id, providerId: deps.issuer } });
  if (other) {
    deps.logger.warn({ sub: member.sub }, '[REGISTRE] Skipped a member whose email is bound to another identity');
    return false;
  }
  return true;
}

/** Creates the SSO-only member a Registre member signs in to for the first time. */
async function provisionUser(tx: Tx, member: DirectoryMember, email: string): Promise<string> {
  const user = await tx.user.create({
    data: { email, ...splitName(member.name, email), role: 'MEMBER', emailVerified: member.email_verified === true },
    select: { id: true },
  });
  return user.id;
}
