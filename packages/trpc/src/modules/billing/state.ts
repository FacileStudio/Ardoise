import type { PrismaClient } from '@repo/database';
import type {
  CompDef,
  FeatureDef,
  OverrideDef,
  PersonInput,
  PlanValues,
  ResolveInput,
  SpaceInput,
} from './resolve';
import type { Entitlements } from './values';

/** One space member as Registre's directory snapshot lists it. */
export interface DirectoryMemberView {
  sub: string;
  email: string;
  role: string;
}

/** One space as Registre's directory snapshot lists it, with the entitlements it last received. */
export interface DirectorySpaceView {
  id: string;
  name?: string;
  members: DirectoryMemberView[];
  entitlements?: Record<string, unknown>;
}

/** One person's personal entitlements as Registre's snapshot lists them. */
export interface DirectoryPersonView {
  sub: string;
  entitlements?: Record<string, unknown>;
}

/** The part of Registre's directory snapshot billing reads. */
export interface DirectoryView {
  version: number;
  spaces: DirectorySpaceView[];
  people?: DirectoryPersonView[];
}

/** Where billing reads the directory snapshot from. */
export interface DirectorySource {
  snapshot(): Promise<DirectoryView>;
}

/** Registre's owner role name. */
export const OWNER_ROLE = 'owner';

const versionInclude = {
  plan: { select: { key: true } },
  features: { select: { value: true, feature: { select: { key: true } } } },
} as const;

type VersionRow = {
  plan: { key: string };
  features: { value: unknown; feature: { key: string } }[];
};

/** Flattens a plan version row into the values resolution reads. */
export function toPlanValues(version: VersionRow): PlanValues {
  return {
    key: version.plan.key,
    values: Object.fromEntries(version.features.map((row) => [row.feature.key, row.value])),
  };
}

/** Every feature, shaped for resolution. */
export async function loadFeatures(db: PrismaClient): Promise<FeatureDef[]> {
  const rows = await db.feature.findMany({ orderBy: { key: 'asc' } });
  return rows.map((row) => ({ key: row.key, kind: row.kind, defaultValue: row.defaultValue }));
}

/** The key of the plan sorted first, which free spaces report; `solo` when no plan exists. */
async function freePlanKey(db: PrismaClient): Promise<string> {
  const plan = await db.plan.findFirst({ orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] });
  return plan?.key ?? 'solo';
}

/**
 * The latest version of a plan, whatever its status. Comps use it so the
 * owners get the top plan before anything is published.
 */
async function latestVersion(db: PrismaClient, planKey: string) {
  return db.planVersion.findFirst({
    where: { plan: { key: planKey } },
    orderBy: { version: 'desc' },
    include: versionInclude,
  });
}

/** Indexes every snapshot member by lowercased email, as Registre verified it. */
function subsByEmail(directory: DirectoryView): Map<string, string> {
  const out = new Map<string, string>();
  for (const space of directory.spaces) {
    for (const member of space.members) {
      if (member.email && member.sub) out.set(member.email.toLowerCase(), member.sub);
    }
  }
  return out;
}

/** Every distinct person in the snapshot. */
function peopleOf(directory: DirectoryView): PersonInput[] {
  const seen = new Map<string, PersonInput>();
  for (const space of directory.spaces) {
    for (const member of space.members) {
      if (member.sub && !seen.has(member.sub)) seen.set(member.sub, { sub: member.sub, email: member.email });
    }
  }
  return [...seen.values()];
}

/**
 * Comped people resolved to Registre subjects through the verified emails of
 * the snapshot. Emails Registre does not know are returned in `unresolved`
 * and grant nothing.
 */
async function loadComps(db: PrismaClient, directory: DirectoryView) {
  const rows = await db.compedPerson.findMany({ orderBy: { email: 'asc' } });
  const subs = subsByEmail(directory);
  const plans = new Map<string, PlanValues | null>();
  const comps: CompDef[] = [];
  const unresolved: string[] = [];
  for (const row of rows) {
    const sub = subs.get(row.email.toLowerCase());
    if (!sub) {
      unresolved.push(row.email);
      continue;
    }
    if (!plans.has(row.planKey)) {
      const version = await latestVersion(db, row.planKey);
      plans.set(row.planKey, version ? toPlanValues(version) : null);
    }
    comps.push({ sub, plan: plans.get(row.planKey) ?? null });
  }
  return { comps, unresolved };
}

async function loadSpaces(db: PrismaClient, directory: DirectoryView): Promise<SpaceInput[]> {
  const ids = directory.spaces.map((space) => space.id);
  const rows = await db.spaceSubscription.findMany({
    where: { registreSpaceId: { in: ids } },
    include: { planVersion: { include: versionInclude } },
  });
  const byId = new Map(rows.map((row) => [row.registreSpaceId, row]));
  return directory.spaces.map((space) => {
    const row = byId.get(space.id);
    return {
      id: space.id,
      ownerSubs: space.members.filter((m) => m.role === OWNER_ROLE && m.sub).map((m) => m.sub),
      subscription: row
        ? {
            status: row.status,
            currentPeriodEnd: row.currentPeriodEnd,
            pastDueSince: row.pastDueSince,
            plan: row.planVersion ? toPlanValues(row.planVersion) : null,
          }
        : null,
    };
  });
}

async function loadOverrides(db: PrismaClient): Promise<OverrideDef[]> {
  const rows = await db.entitlementOverride.findMany({
    orderBy: { createdAt: 'asc' },
    include: { feature: { select: { key: true } } },
  });
  return rows.map((row) => ({
    scope: row.scope,
    registreSpaceId: row.registreSpaceId,
    personEmail: row.personEmail,
    feature: row.feature.key,
    value: row.value,
    expiresAt: row.expiresAt,
  }));
}

/** Gathers everything resolveEntitlements needs from the database and one directory snapshot. */
export async function loadResolveInput(
  db: PrismaClient,
  directory: DirectoryView,
  now = new Date()
): Promise<{ input: ResolveInput; unresolvedComps: string[] }> {
  const [features, free, { comps, unresolved }, spaces, overrides] = await Promise.all([
    loadFeatures(db),
    freePlanKey(db),
    loadComps(db, directory),
    loadSpaces(db, directory),
    loadOverrides(db),
  ]);
  return {
    input: { now, features, freePlanKey: free, comps, spaces, people: peopleOf(directory), overrides },
    unresolvedComps: unresolved,
  };
}

/** Whether two entitlement maps hold exactly the same keys and values. */
export function sameEntitlements(a: Entitlements, b: Record<string, unknown> | undefined): boolean {
  const other = b ?? {};
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(other).length) return false;
  return keys.every((key) => other[key] === a[key]);
}
