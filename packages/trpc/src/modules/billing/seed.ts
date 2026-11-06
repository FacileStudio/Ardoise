import type { PrismaClient } from '@repo/database';
import { lookupKeyFor, type EntitlementValue, type FeatureKind } from './values';

interface SeedFeature {
  key: string;
  app: string;
  kind: FeatureKind;
  unit: string | null;
  description: string;
  values: { solo: EntitlementValue; pro: EntitlementValue; studio: EntitlementValue };
}

/** The six suite features with the contract's Solo, Pro and Studio values. */
export const SEED_FEATURES: SeedFeature[] = [
  { key: 'nuage.storage_gb', app: 'nuage', kind: 'limit', unit: 'Go', description: 'Stockage Nuage', values: { solo: 5, pro: 100, studio: 500 } },
  { key: 'courrier.mailboxes', app: 'courrier', kind: 'limit', unit: 'boîtes', description: 'Boîtes mail Courrier', values: { solo: 1, pro: 5, studio: -1 } },
  { key: 'echo.max_call_minutes', app: 'echo', kind: 'limit', unit: 'minutes', description: 'Durée maximale d’un appel Écho', values: { solo: 40, pro: -1, studio: -1 } },
  { key: 'echo.max_participants', app: 'echo', kind: 'limit', unit: 'participants', description: 'Participants par appel Écho', values: { solo: 4, pro: 25, studio: 100 } },
  { key: 'echo.recording', app: 'echo', kind: 'bool', unit: null, description: 'Enregistrement des appels Écho', values: { solo: false, pro: true, studio: true } },
  { key: 'glouton.access', app: 'glouton', kind: 'bool', unit: null, description: 'Accès à Glouton', values: { solo: false, pro: true, studio: true } },
];

/** The three tiers, with their prices in cents (none for Solo). */
export const SEED_PLANS = [
  { key: 'solo' as const, name: 'Solo', sortOrder: 0, isFree: true, prices: [] },
  { key: 'pro' as const, name: 'Pro', sortOrder: 1, isFree: false, prices: [{ interval: 'month' as const, amount: 1200 }, { interval: 'year' as const, amount: 12000 }] },
  { key: 'studio' as const, name: 'Studio', sortOrder: 2, isFree: false, prices: [{ interval: 'month' as const, amount: 3900 }, { interval: 'year' as const, amount: 39000 }] },
];

/** The Facile Studio owners, comped on Studio forever. */
export const SEED_COMPS = [
  'yann@facile.studio',
  'noah@facile.studio',
  'camille@facile.studio',
  'mazouz@facile.studio',
];

/**
 * Parses BILLING_SEED_COMP_SUBS, `email=sub` pairs separated by commas, into
 * a map of lowercased email to Registre subject. Malformed pairs are dropped.
 */
export function parseCompSubs(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const pair of (raw ?? '').split(',')) {
    const [email, sub] = pair.split('=').map((part) => part.trim());
    if (email && sub && email.includes('@') && /^[\x21-\x7e]{1,200}$/.test(sub)) out.set(email.toLowerCase(), sub);
  }
  return out;
}

/** What one seed run created; a rerun on a seeded database creates nothing. */
export interface SeedResult {
  features: number;
  plans: number;
  versions: number;
  comps: number;
  subjects: number;
}

/**
 * Seeds the billing catalog: the six features with Solo defaults, Solo, Pro
 * and Studio as DRAFT version 1 with the contract values and prices, and the
 * comped owners on Studio. A comp grants nothing until it carries the
 * owner's Registre subject: `compSubs` (BILLING_SEED_COMP_SUBS) fills the
 * subjects still missing. Idempotent: it only creates what is missing and
 * never edits values an admin may have changed.
 */
export async function seedBilling(db: PrismaClient, compSubs?: string): Promise<SeedResult> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ardoise.billing.seed'))`;
      return seedLocked(tx as PrismaClient, compSubs);
    },
    { maxWait: 60_000, timeout: 60_000 }
  );
}

/** The seed itself, run while holding the seed lock so concurrent boots never race. */
async function seedLocked(db: PrismaClient, compSubs?: string): Promise<SeedResult> {
  const result: SeedResult = { features: 0, plans: 0, versions: 0, comps: 0, subjects: 0 };
  const subjects = parseCompSubs(compSubs);
  const featureIds = new Map<string, string>();
  for (const feature of SEED_FEATURES) {
    const existing = await db.feature.findUnique({ where: { key: feature.key } });
    const row =
      existing ??
      (await db.feature.create({
        data: {
          key: feature.key,
          app: feature.app,
          kind: feature.kind,
          unit: feature.unit,
          description: feature.description,
          defaultValue: feature.values.solo,
        },
      }));
    if (!existing) result.features += 1;
    featureIds.set(feature.key, row.id);
  }

  for (const plan of SEED_PLANS) {
    const existing = await db.plan.findUnique({ where: { key: plan.key }, include: { _count: { select: { versions: true } } } });
    const row = existing ?? (await db.plan.create({
        data: {
          key: plan.key,
          name: plan.name,
          sortOrder: plan.sortOrder,
          isFree: plan.isFree && !(await db.plan.findFirst({ where: { isFree: true } })),
        },
      }));
    if (!existing) result.plans += 1;
    if (existing && existing._count.versions > 0) continue;
    await db.planVersion.create({
      data: {
        planId: row.id,
        version: 1,
        status: 'draft',
        features: {
          create: SEED_FEATURES.map((feature) => ({
            featureId: featureIds.get(feature.key)!,
            value: feature.values[plan.key],
          })),
        },
        prices: {
          create: plan.prices.map((price) => ({
            interval: price.interval,
            amount: price.amount,
            currency: 'eur',
            lookupKey: lookupKeyFor(plan.key, price.interval),
          })),
        },
      },
    });
    result.versions += 1;
  }

  for (const email of SEED_COMPS) {
    const registreSub = subjects.get(email) ?? null;
    const existing = await db.compedPerson.findUnique({ where: { email } });
    if (!existing) {
      await db.compedPerson.create({ data: { email, registreSub, reason: 'Facile Studio owner', planKey: 'studio' } });
      result.comps += 1;
      if (registreSub) result.subjects += 1;
    } else if (!existing.registreSub && registreSub) {
      await db.compedPerson.update({ where: { id: existing.id }, data: { registreSub } });
      result.subjects += 1;
    }
  }
  return result;
}
