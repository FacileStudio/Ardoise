import type { PrismaClient } from '@repo/database';
import type Stripe from 'stripe';
import { requestEntitlementPush } from './push';

/** The metadata key Ardoise sets on every billing customer and subscription. */
export const SPACE_METADATA_KEY = 'registre_space_id';

/** The Stripe events the billing module handles. */
export const BILLING_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

/** Minimal logger shape, satisfied by pino. */
export interface BillingLogger {
  info(object: unknown, message?: string): void;
  warn(object: unknown, message?: string): void;
}

const SPACE_ID = /^[A-Za-z0-9_-]{1,200}$/;

/** A registre_space_id metadata value, or null when absent or malformed. */
export function spaceIdFromMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  const value = metadata?.[SPACE_METADATA_KEY];
  return typeof value === 'string' && SPACE_ID.test(value) ? value : null;
}

function invoiceSubscription(invoice: Stripe.Invoice) {
  return invoice.parent?.subscription_details ?? null;
}

/**
 * Whether an event belongs to the billing module: a subscription event, or
 * an invoice of a subscription, whose metadata carries registre_space_id.
 * Everything else stays with the client-invoice payment flow.
 */
export function isBillingEvent(event: Stripe.Event): boolean {
  if (!BILLING_EVENT_TYPES.has(event.type)) return false;
  if (event.type.startsWith('invoice.')) {
    return spaceIdFromMetadata(invoiceSubscription(event.data.object as Stripe.Invoice)?.metadata) !== null;
  }
  return spaceIdFromMetadata((event.data.object as Stripe.Subscription).metadata) !== null;
}

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === 'string' ? value : (value?.id ?? null);

const TERMINAL = new Set(['canceled', 'incomplete_expired', 'unpaid']);

/**
 * Checks that Ardoise itself bound this subscription to the space: the
 * customer must be the one stored on the space's row, or, when the row has
 * none yet, a live Stripe customer whose own metadata names the same space.
 */
async function trustedCustomer(
  db: PrismaClient,
  stripe: Stripe,
  spaceId: string,
  customerId: string,
  storedCustomerId: string | null | undefined
): Promise<boolean> {
  if (storedCustomerId) return storedCustomerId === customerId;
  const customer = await stripe.customers.retrieve(customerId);
  if ((customer as Stripe.DeletedCustomer).deleted) return false;
  if (spaceIdFromMetadata((customer as Stripe.Customer).metadata) !== spaceId) return false;
  const other = await db.spaceSubscription.findUnique({ where: { stripeCustomerId: customerId } });
  return !other || other.registreSpaceId === spaceId;
}

/**
 * Mirrors one Stripe subscription onto its space's SpaceSubscription row.
 * Returns false, and changes nothing, when the subscription cannot be
 * trusted or is an older one the space has replaced.
 */
export async function syncSubscription(
  db: PrismaClient,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  logger: BillingLogger,
  failedAt?: Date
): Promise<boolean> {
  const spaceId = spaceIdFromMetadata(subscription.metadata);
  const customerId = idOf(subscription.customer);
  if (!spaceId || !customerId) return false;
  const row = await db.spaceSubscription.findUnique({ where: { registreSpaceId: spaceId } });
  if (!(await trustedCustomer(db, stripe, spaceId, customerId, row?.stripeCustomerId))) {
    logger.warn({ subscription: subscription.id }, '[BILLING] Subscription customer does not match its space, ignored');
    return false;
  }
  if (row?.stripeSubscriptionId && row.stripeSubscriptionId !== subscription.id && TERMINAL.has(subscription.status)) {
    return false;
  }

  const item = subscription.items.data[0];
  const price = item?.price.id
    ? await db.planPrice.findUnique({ where: { stripePriceId: item.price.id } })
    : null;
  const status = subscription.status;
  const pastDueSince =
    status === 'past_due' ? (row?.pastDueSince ?? failedAt ?? new Date()) : null;
  const data = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    planVersionId: price?.versionId ?? null,
    status,
    currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
    pastDueSince,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
  await db.spaceSubscription.upsert({
    where: { registreSpaceId: spaceId },
    create: { registreSpaceId: spaceId, ...data },
    update: data,
  });
  return true;
}

function subscriptionIdOf(event: Stripe.Event): string | null {
  if (event.type.startsWith('invoice.')) {
    return idOf(invoiceSubscription(event.data.object as Stripe.Invoice)?.subscription);
  }
  return (event.data.object as Stripe.Subscription).id;
}

/**
 * Handles one verified billing event. The event id is recorded in
 * BillingEvent before any side effect, so a replay changes nothing; a
 * failure removes the record so Stripe's redelivery runs again. The
 * subscription is re-read from Stripe, which makes the order of deliveries
 * irrelevant.
 */
export async function handleBillingEvent(
  db: PrismaClient,
  stripe: Stripe,
  event: Stripe.Event,
  logger: BillingLogger
): Promise<void> {
  const recorded = await db.billingEvent.createMany({
    data: [{ stripeEventId: event.id, type: event.type }],
    skipDuplicates: true,
  });
  if (recorded.count === 0) return;
  try {
    const subscriptionId = subscriptionIdOf(event);
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const failedAt = event.type === 'invoice.payment_failed' ? new Date(event.created * 1000) : undefined;
      await syncSubscription(db, stripe, subscription, logger, failedAt);
    }
    await db.billingEvent.update({ where: { stripeEventId: event.id }, data: { processedAt: new Date() } });
  } catch (error) {
    await db.billingEvent.delete({ where: { stripeEventId: event.id } }).catch(() => {});
    throw error;
  }
  requestEntitlementPush();
}

/** Lists every Stripe subscription carrying registre_space_id and repairs its SpaceSubscription row. */
export async function reconcileSubscriptions(
  db: PrismaClient,
  stripe: Stripe,
  logger: BillingLogger
): Promise<{ repaired: number; skipped: number }> {
  let repaired = 0;
  let skipped = 0;
  for await (const subscription of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    if (!spaceIdFromMetadata(subscription.metadata)) continue;
    try {
      if (await syncSubscription(db, stripe, subscription, logger)) repaired += 1;
      else skipped += 1;
    } catch (error) {
      skipped += 1;
      logger.warn(
        { subscription: subscription.id, error: error instanceof Error ? error.message : String(error) },
        '[BILLING] Subscription reconcile failed'
      );
    }
  }
  requestEntitlementPush();
  return { repaired, skipped };
}
