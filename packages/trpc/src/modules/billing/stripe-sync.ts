import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type Stripe from 'stripe';
import { lookupKeyFor, productIdFor } from './values';

/** How migrated subscribers move to the new price: on their next invoice, or now with a prorated invoice. */
export type MigrationMode = 'period_end' | 'immediate';

/** Subscription statuses that still bill, and so still count as subscribers. */
export const LIVE_STATUSES = ['active', 'trialing', 'past_due'];

const versionDetail = {
  plan: true,
  prices: true,
  features: { include: { feature: { select: { key: true } } } },
} as const;

/** Loads a plan version with its plan, prices and feature values, or fails NOT_FOUND. */
export async function requireVersion(db: PrismaClient, id: string) {
  const version = await db.planVersion.findUnique({ where: { id }, include: versionDetail });
  if (!version) throw new TRPCError({ code: 'NOT_FOUND', message: 'Version introuvable' });
  return version;
}

/** The published version of a plan, if any. */
export function publishedVersion(db: PrismaClient, planId: string) {
  return db.planVersion.findFirst({
    where: { planId, status: 'published' },
    orderBy: { version: 'desc' },
    include: versionDetail,
  });
}

/** Fails unless the version is still a draft: published versions are immutable. */
export function assertDraft(version: { status: string }): void {
  if (version.status !== 'draft') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Une version publiée ne se modifie pas: créez une nouvelle version brouillon',
    });
  }
}

function isMissing(error: unknown): boolean {
  return (error as { statusCode?: number })?.statusCode === 404;
}

/** Creates the plan's Stripe product `plan_<key>`, or brings its name up to date and reactivates it. */
async function upsertProduct(stripe: Stripe, plan: { key: string; name: string }): Promise<string> {
  const id = productIdFor(plan.key);
  try {
    await stripe.products.retrieve(id);
    await stripe.products.update(id, { name: plan.name, active: true });
  } catch (error) {
    if (!isMissing(error)) throw error;
    await stripe.products.create(
      { id, name: plan.name, metadata: { plan_key: plan.key } },
      { idempotencyKey: `ardoise_product_${plan.key}` }
    );
  }
  return id;
}

type PriceRow = { id: string; interval: 'month' | 'year'; amount: number; currency: string; stripePriceId: string | null };

/** Whether a Stripe price bills exactly this amount, currency and interval. */
export function priceMatches(stripePrice: Stripe.Price, row: PriceRow): boolean {
  return (
    stripePrice.unit_amount === row.amount &&
    stripePrice.currency === row.currency &&
    stripePrice.recurring?.interval === row.interval
  );
}

/**
 * The Stripe price for one plan price: the stored one when it still bills
 * the same amount, currency and interval (its lookup key moved back here if
 * needed), else a new one. The idempotency key carries the amount and
 * currency, so a retry after a price change never reuses the old price.
 */
async function ensurePrice(
  stripe: Stripe,
  product: string,
  version: { id: string; version: number; plan: { key: string } },
  row: PriceRow
): Promise<string> {
  const lookupKey = lookupKeyFor(version.plan.key, row.interval);
  if (row.stripePriceId) {
    const existing = await stripe.prices.retrieve(row.stripePriceId).catch((error) => {
      if (isMissing(error)) return null;
      throw error;
    });
    if (existing && priceMatches(existing, row)) {
      if (existing.lookup_key !== lookupKey || !existing.active) {
        await stripe.prices.update(existing.id, { lookup_key: lookupKey, transfer_lookup_key: true, active: true });
      }
      return existing.id;
    }
  }
  const created = await stripe.prices.create(
    {
      product,
      currency: row.currency,
      unit_amount: row.amount,
      recurring: { interval: row.interval },
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      metadata: { plan_key: version.plan.key, plan_version: String(version.version) },
    },
    { idempotencyKey: `ardoise_publish_${version.id}_${row.interval}_${row.amount}_${row.currency}` }
  );
  return created.id;
}

/** How a published version compares to the one before it. */
export interface PublishPreview {
  features: { key: string; before: unknown; after: unknown }[];
  prices: { interval: string; before: number | null; after: number | null }[];
  affectedSubscriptions: number;
}

/** Diffs a draft against the plan's published version and counts the subscribers on older versions. */
export async function previewPublish(db: PrismaClient, versionId: string): Promise<PublishPreview> {
  const draft = await requireVersion(db, versionId);
  const current = await publishedVersion(db, draft.planId);
  const before = new Map(current?.features.map((row) => [row.feature.key, row.value]) ?? []);
  const after = new Map(draft.features.map((row) => [row.feature.key, row.value]));
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  const priceOf = (rows: { interval: string; amount: number }[] | undefined, interval: string) =>
    rows?.find((row) => row.interval === interval)?.amount ?? null;
  const affectedSubscriptions = await db.spaceSubscription.count({
    where: { planVersion: { planId: draft.planId }, status: { in: LIVE_STATUSES } },
  });
  return {
    features: keys
      .map((key) => ({ key, before: before.get(key) ?? null, after: after.get(key) ?? null }))
      .filter((row) => JSON.stringify(row.before) !== JSON.stringify(row.after)),
    prices: ['month', 'year']
      .map((interval) => ({
        interval,
        before: priceOf(current?.prices, interval),
        after: priceOf(draft.prices, interval),
      }))
      .filter((row) => row.before !== row.after),
    affectedSubscriptions,
  };
}

/**
 * Publishes a draft version. The Stripe product `plan_<key>` is upserted, one
 * recurring price per interval is created with lookup key
 * `plan_<key>_<interval>` and transfer_lookup_key, the version is marked
 * published and the previous one archived in one transaction (a price whose
 * amount, currency and interval did not change keeps its Stripe price, whose
 * unique id moves from the old row to the new one in that same transaction), and only once
 * that has committed are the previous version's Stripe prices archived. Every
 * Stripe write carries an idempotency key, so a retry after a failure
 * reuses what Stripe already created.
 */
export async function publishVersion(
  db: PrismaClient,
  stripe: Stripe | null,
  versionId: string,
  logger: { warn(object: unknown, message?: string): void } = { warn() {} }
) {
  const version = await requireVersion(db, versionId);
  assertDraft(version);
  const previous = await publishedVersion(db, version.planId);
  const kept = new Set<string>();
  const assignments: { rowId: string; stripePriceId: string }[] = [];

  if (version.prices.length > 0) {
    if (!stripe) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe n’est pas configuré' });
    }
    const product = await upsertProduct(stripe, version.plan);
    for (const price of version.prices) {
      const reusable = price.stripePriceId
        ? null
        : previous?.prices.find(
            (old) =>
              old.stripePriceId &&
              old.interval === price.interval &&
              old.amount === price.amount &&
              old.currency === price.currency
          );
      const candidate = reusable ? { ...price, stripePriceId: reusable.stripePriceId } : price;
      const stripePriceId = await ensurePrice(stripe, product, version, candidate);
      kept.add(stripePriceId);
      if (stripePriceId !== price.stripePriceId) assignments.push({ rowId: price.id, stripePriceId });
    }
  }

  await db.$transaction(async (tx) => {
    const claimed = await tx.planVersion.updateMany({
      where: { id: version.id, status: 'draft' },
      data: { status: 'published', publishedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Cette version vient d’être publiée ailleurs' });
    }
    await tx.planVersion.updateMany({
      where: { planId: version.planId, status: 'published', id: { not: version.id } },
      data: { status: 'archived' },
    });
    for (const { rowId, stripePriceId } of assignments) {
      await tx.planPrice.updateMany({ where: { stripePriceId, id: { not: rowId } }, data: { stripePriceId: null } });
      await tx.planPrice.update({ where: { id: rowId }, data: { stripePriceId } });
    }
  });

  const archiveFailures: string[] = [];
  if (stripe) {
    for (const price of previous?.prices ?? []) {
      if (!price.stripePriceId || kept.has(price.stripePriceId)) continue;
      try {
        await stripe.prices.update(
          price.stripePriceId,
          { active: false },
          { idempotencyKey: `ardoise_archive_${price.stripePriceId}` }
        );
      } catch (error) {
        archiveFailures.push(price.stripePriceId);
        logger.warn(
          { price: price.stripePriceId, error: error instanceof Error ? error.message : String(error) },
          '[BILLING] Archiving a previous Stripe price failed; archive it in Stripe by hand'
        );
      }
    }
  }
  return { previousVersionId: previous?.id ?? null, archiveFailures };
}

/** What migrating subscribers did. */
export interface MigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
}

/**
 * Moves every live Stripe subscription on an older version of the plan to
 * the published version's price of the same interval. `period_end` changes
 * the price without proration (the next invoice bills the new amount);
 * `immediate` prorates and invoices now.
 */
export async function migrateSubscribers(
  db: PrismaClient,
  stripe: Stripe,
  planId: string,
  mode: MigrationMode,
  logger: { warn(object: unknown, message?: string): void }
): Promise<MigrationResult> {
  const target = await publishedVersion(db, planId);
  if (!target) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Aucune version publiée pour cette offre' });
  }
  const rows = await db.spaceSubscription.findMany({
    where: {
      planVersion: { planId },
      planVersionId: { not: target.id },
      stripeSubscriptionId: { not: null },
      status: { in: LIVE_STATUSES },
    },
  });
  const result: MigrationResult = { migrated: 0, skipped: 0, failed: 0 };
  for (const row of rows) {
    try {
      const subscription = await stripe.subscriptions.retrieve(row.stripeSubscriptionId!);
      const item = subscription.items.data[0];
      const interval = item?.price.recurring?.interval;
      const price = target.prices.find((p) => p.interval === interval)?.stripePriceId;
      if (!item || !price) {
        result.skipped += 1;
        continue;
      }
      await stripe.subscriptions.update(
        subscription.id,
        {
          items: [{ id: item.id, price }],
          proration_behavior: mode === 'immediate' ? 'always_invoice' : 'none',
        },
        { idempotencyKey: `ardoise_migrate_${subscription.id}_${target.id}_${mode}_${price}_${item.id}` }
      );
      await db.spaceSubscription.update({ where: { id: row.id }, data: { planVersionId: target.id } });
      result.migrated += 1;
    } catch (error) {
      result.failed += 1;
      logger.warn(
        { subscriptionRow: row.id, error: error instanceof Error ? error.message : String(error) },
        '[BILLING] Subscriber migration failed'
      );
    }
  }
  return result;
}

/**
 * Before a draft is deleted, gives its Stripe prices' lookup keys back: a
 * publish that failed after creating prices has already moved the lookup
 * keys onto them. The published version's price of the same interval takes
 * its key back (transfer_lookup_key), and the draft's price is archived.
 */
export async function releaseDraftPrices(
  db: PrismaClient,
  stripe: Stripe | null,
  draft: { planId: string; plan: { key: string }; prices: PriceRow[] }
): Promise<void> {
  const created = draft.prices.filter((price) => price.stripePriceId);
  if (created.length === 0) return;
  if (!stripe) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Stripe n’est pas configuré' });
  }
  const published = await publishedVersion(db, draft.planId);
  for (const price of created) {
    const back = published?.prices.find((row) => row.interval === price.interval)?.stripePriceId;
    if (back && back !== price.stripePriceId) {
      await stripe.prices.update(back, {
        lookup_key: lookupKeyFor(draft.plan.key, price.interval),
        transfer_lookup_key: true,
      });
    }
    if (back !== price.stripePriceId) await stripe.prices.update(price.stripePriceId!, { active: false });
  }
}
