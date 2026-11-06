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
  email_verified?: boolean;
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

/** The plan spaces get without a subscription or comp: the plan flagged free, key `free` when none is. */
async function freePlan(db: PrismaClient): Promise<PlanValues> {
  const plan = await db.plan.findFirst({ where: { isFree: true }, select: { key: true } });
  if (!plan) return { key: 'free', values: {} };
  const version = await grantedVersion(db, plan.key);
  return version ? toPlanValues(version) : { key: plan.key, values: {} };
}

/**
 * The version of a plan that comps and the free plan grant: the published
 * one, else the latest when none is published, so the owners get the top
 * plan before anything is published but never an unpublished draft after.
 */
export async function grantedVersion(db: PrismaClient, planKey: string) {
  const published = await db.planVersion.findFirst({
    where: { plan: { key: planKey }, status: 'published' },
    orderBy: { version: 'desc' },
    include: versionInclude,
  });
  return (
    published ??
    db.planVersion.findFirst({
      where: { plan: { key: planKey } },
      orderBy: { version: 'desc' },
      include: versionInclude,
    })
  );
}

/**
 * Indexes snapshot members by lowercased email, keeping only emails the
 * snapshot marks verified (`email_verified: true`). Today's snapshot carries
 * no such flag, so this is empty and matching relies on Registre subjects.
 */
export function verifiedSubsByEmail(directory: DirectoryView): Map<string, string> {
  const out = new Map<string, string>();
  for (const space of directory.spaces) {
    for (const member of space.members) {
      if (member.email && member.sub && member.email_verified === true) {
        out.set(member.email.toLowerCase(), member.sub);
      }
    }
  }
  return out;
}

const SNAPSHOT_TTL_MS = 30_000;

let directorySource: DirectorySource | null = null;
let snapshotCache: { at: number; value: Promise<DirectoryView> } | null = null;

/** Registers where billing reads Registre's snapshot from; null when Registre is not configured. */
export function registerDirectorySource(source: DirectorySource | null): void {
  directorySource = source;
  snapshotCache = null;
}

/** The registered Registre snapshot, cached 30 seconds, or null when Registre is not configured. */
export function cachedDirectory(now = Date.now()): Promise<DirectoryView> | null {
  if (!directorySource) return null;
  if (snapshotCache && now - snapshotCache.at < SNAPSHOT_TTL_MS) return snapshotCache.value;
  const value = directorySource.snapshot();
  snapshotCache = { at: now, value };
  value.catch(() => {
    if (snapshotCache?.value === value) snapshotCache = null;
  });
  return value;
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

/** Loads the latest version of each plan key once. */
function planLoader(db: PrismaClient) {
  const plans = new Map<string, Promise<PlanValues | null>>();
  return (key: string) => {
    if (!plans.has(key)) {
      plans.set(key, grantedVersion(db, key).then((version) => (version ? toPlanValues(version) : null)));
    }
    return plans.get(key)!;
  };
}

/**
 * Comped people by Registre subject: the subject staff stored, else one the
 * snapshot maps from a verified email. A comp nobody can resolve is returned
 * in `unresolved` and grants nothing.
 */
async function loadComps(db: PrismaClient, directory: DirectoryView, plan: ReturnType<typeof planLoader>) {
  const rows = await db.compedPerson.findMany({ orderBy: { email: 'asc' } });
  const verified = verifiedSubsByEmail(directory);
  const comps: CompDef[] = [];
  const unresolved: string[] = [];
  for (const row of rows) {
    const sub = row.registreSub ?? verified.get(row.email.toLowerCase());
    if (!sub) {
      unresolved.push(row.email);
      continue;
    }
    comps.push({ sub, plan: await plan(row.planKey) });
  }
  return { comps, unresolved };
}

async function loadSpaces(
  db: PrismaClient,
  directory: DirectoryView,
  plan: ReturnType<typeof planLoader>
): Promise<SpaceInput[]> {
  const ids = directory.spaces.map((space) => space.id);
  const [rows, spaceComps] = await Promise.all([
    db.spaceSubscription.findMany({
      where: { registreSpaceId: { in: ids } },
      include: { planVersion: { include: versionInclude } },
    }),
    db.compedSpace.findMany({ where: { registreSpaceId: { in: ids } } }),
  ]);
  const byId = new Map(rows.map((row) => [row.registreSpaceId, row]));
  const compPlans = new Map<string, PlanValues | null>();
  for (const comp of spaceComps) compPlans.set(comp.registreSpaceId, await plan(comp.planKey));
  return directory.spaces.map((space) => {
    const row = byId.get(space.id);
    return {
      id: space.id,
      comp: compPlans.get(space.id) ?? null,
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
    personSub: row.personSub,
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
  const plan = planLoader(db);
  const [features, free, { comps, unresolved }, spaces, overrides] = await Promise.all([
    loadFeatures(db),
    freePlan(db),
    loadComps(db, directory, plan),
    loadSpaces(db, directory, plan),
    loadOverrides(db),
  ]);
  return {
    input: { now, features, free, comps, spaces, people: peopleOf(directory), overrides },
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
