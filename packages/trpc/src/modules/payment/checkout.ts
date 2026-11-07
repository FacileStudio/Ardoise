import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import { logger } from '@repo/logger';
import { requirePlatformStudio } from '../space/studio';
import { isPayableStatus, expectedCents } from './amounts';
import { paymentFooter } from './footer';
import { digest } from '../billing/api';

const PORTAL_TAG = 'ardoise-maintenance';
const STRIPE_HOST = 'checkout.stripe.com';
const PORTAL_HOST = 'billing.stripe.com';

export interface CheckoutPayment {
  id: string;
  spaceId: string;
  clientId: string;
  missionId?: string | null;
  status: string;
  frequency: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  collectionMethod: 'STRIPE' | 'MANUAL';
  amount: unknown;
  totalWithFees: unknown;
  description: string;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
  stripeCheckoutSessionId?: string | null;
  client: {
    id: string;
    companyName: string;
    contactEmail: string | null;
    stripeCustomerId: string | null;
  };
}

export interface CheckoutUrls {
  success: string;
  cancel: string;
}

const INTERVALS = { MONTHLY: 'month', YEARLY: 'year' } as const;

const hostedUrl = (url: string | null | undefined, host: string): string => {
  try {
    const parsed = new URL(url ?? '');
    if (parsed.protocol === 'https:' && parsed.hostname === host) return parsed.toString();
  } catch {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Stripe returned no usable URL',
    });
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe returned no usable URL' });
};

const idempotencyKey = (payment: CheckoutPayment, previousSession: string | null): string =>
  `checkout:${payment.id}:${expectedCents(payment)}:${previousSession ?? 'first'}`;

function assertPayable(payment: CheckoutPayment): void {
  if (payment.collectionMethod !== 'STRIPE') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This payment is not payable online' });
  }
  if (!isPayableStatus(payment.status)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This payment cannot be paid right now' });
  }
  if (payment.stripeSubscriptionId && payment.status !== 'PENDING') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Manage this maintenance payment from its payment method settings',
    });
  }
}

const isGone = (err: unknown) => (err as { code?: string }).code === 'resource_missing';

const IN_FLIGHT_INTENT = ['succeeded', 'processing', 'requires_capture'];
const LIVE_SUBSCRIPTION = ['active', 'trialing'];

const alreadyOnItsWay = () =>
  new TRPCError({
    code: 'CONFLICT',
    message: 'This payment is already being processed. Please wait for its confirmation.',
  });

async function retireIntent(stripe: StripeService, id: string): Promise<void> {
  try {
    const intent = await stripe.client.paymentIntents.retrieve(id);
    if (IN_FLIGHT_INTENT.includes(intent.status)) throw alreadyOnItsWay();
    if (intent.status !== 'canceled') await stripe.client.paymentIntents.cancel(id);
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    if (isGone(err)) return;
    logger.warn({ err, intent: id }, 'Could not retire a legacy PaymentIntent');
    throw alreadyOnItsWay();
  }
}

async function retireSubscription(stripe: StripeService, id: string): Promise<void> {
  try {
    const subscription = await stripe.client.subscriptions.retrieve(id);
    if (LIVE_SUBSCRIPTION.includes(subscription.status)) throw alreadyOnItsWay();
    if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
      await stripe.client.subscriptions.cancel(id);
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    if (isGone(err)) return;
    logger.warn({ err, subscription: id }, 'Could not retire a legacy subscription');
    throw alreadyOnItsWay();
  }
}

/**
 * Cancels the PaymentIntent or subscription an unpaid payment still holds from the old
 * flow. Terminal objects count as gone. Anything paid or paying, or anything Stripe cannot
 * confirm, blocks the new checkout and keeps the ids so the webhook can settle them.
 */
async function retireLegacyObjects(
  db: PrismaClient,
  stripe: StripeService,
  payment: CheckoutPayment
): Promise<void> {
  if (payment.status !== 'PENDING') return;
  if (!payment.stripePaymentIntentId && !payment.stripeSubscriptionId) return;

  if (payment.stripePaymentIntentId) await retireIntent(stripe, payment.stripePaymentIntentId);
  if (payment.stripeSubscriptionId) await retireSubscription(stripe, payment.stripeSubscriptionId);

  await db.payment.updateMany({
    where: { id: payment.id, status: 'PENDING' },
    data: { stripePaymentIntentId: null, stripeSubscriptionId: null },
  });
}

async function ensureCustomer(
  db: PrismaClient,
  stripe: StripeService,
  payment: CheckoutPayment
): Promise<string> {
  if (payment.client.stripeCustomerId) return payment.client.stripeCustomerId;
  if (!payment.client.contactEmail) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The client has no contact email' });
  }

  const footer = await paymentFooter(db, payment);
  const customer = await stripe.client.customers.create(
    {
      email: payment.client.contactEmail,
      name: payment.client.companyName,
      ...(footer ? { invoice_settings: { footer } } : {}),
      metadata: { clientId: payment.clientId, spaceId: payment.spaceId },
    },
    { idempotencyKey: `customer:${payment.clientId}:${digest(footer ?? '')}` }
  );

  const claimed = await db.client.updateMany({
    where: { id: payment.clientId, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (claimed.count === 1) return customer.id;

  const current = await db.client.findUnique({
    where: { id: payment.clientId },
    select: { stripeCustomerId: true },
  });
  return current?.stripeCustomerId ?? customer.id;
}

function lineItem(payment: CheckoutPayment) {
  const recurring =
    payment.frequency === 'ONE_TIME' ? undefined : { interval: INTERVALS[payment.frequency] };
  return {
    quantity: 1,
    price_data: {
      currency: 'eur',
      unit_amount: expectedCents(payment),
      product_data: { name: payment.description.slice(0, 250) },
      ...(recurring ? { recurring } : {}),
    },
  };
}

async function expireQuietly(stripe: StripeService, sessionId: string): Promise<void> {
  try {
    await stripe.client.checkout.sessions.expire(sessionId);
  } catch (err) {
    logger.debug({ err, sessionId }, 'Checkout session was not expired');
  }
}

/**
 * A completed session blocks a new one only while its money is paid or on its way. A
 * failed bank debit leaves the session complete but its intent back at
 * requires_payment_method, which is retried like any unpaid payment.
 */
async function isStillPaying(
  stripe: StripeService,
  session: { payment_status: string; payment_intent?: unknown; subscription?: unknown }
): Promise<boolean> {
  if (session.payment_status === 'paid') return true;
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  if (intent) {
    return IN_FLIGHT_INTENT.includes((await stripe.client.paymentIntents.retrieve(intent)).status);
  }
  const subscription = typeof session.subscription === 'string' ? session.subscription : null;
  if (subscription) {
    return LIVE_SUBSCRIPTION.includes(
      (await stripe.client.subscriptions.retrieve(subscription)).status
    );
  }
  return false;
}

/**
 * The stored session if it can be reused, after retiring everything else. A session
 * is reused when it is still open and asks for the same amount, currency, mode and
 * return URL. Any other open session is expired so that two live sessions of one
 * payment never exist. A completed session means a payment is already on its way.
 */
async function reuseOrRetire(
  stripe: StripeService,
  payment: CheckoutPayment,
  urls: CheckoutUrls
): Promise<string | null> {
  const id = payment.stripeCheckoutSessionId;
  if (!id) return null;

  let session;
  try {
    session = await stripe.client.checkout.sessions.retrieve(id);
  } catch (err) {
    if (isGone(err)) return null;
    throw err;
  }

  if (session.status === 'complete') {
    if (await isStillPaying(stripe, session)) throw alreadyOnItsWay();
    return null;
  }
  if (session.status !== 'open') return null;

  const recurring = payment.frequency !== 'ONE_TIME';
  const matches =
    session.amount_total === expectedCents(payment) &&
    session.currency === 'eur' &&
    session.mode === (recurring ? 'subscription' : 'payment') &&
    session.success_url === urls.success;
  if (matches && session.url) return session.url;

  await expireQuietly(stripe, id);
  return null;
}

/**
 * Starts a Stripe-hosted Checkout for one payment. Amount, currency, customer and
 * the payment id come from the database row; the caller supplies nothing but the
 * return URLs, which the server builds from FRONTEND_URL. At most one session per
 * payment is live: the stored one is reused or expired before a new one is created.
 */
export async function createPaymentCheckout(
  db: PrismaClient,
  stripe: StripeService,
  payment: CheckoutPayment,
  urls: CheckoutUrls
): Promise<{ url: string }> {
  await requirePlatformStudio(db, payment.spaceId);
  assertPayable(payment);
  await retireLegacyObjects(db, stripe, payment);

  const reused = await reuseOrRetire(stripe, payment, urls);
  if (reused) return { url: hostedUrl(reused, STRIPE_HOST) };

  const recurring = payment.frequency !== 'ONE_TIME';
  const metadata = { payment_id: payment.id, space_id: payment.spaceId };
  const customer = recurring
    ? await ensureCustomer(db, stripe, payment)
    : payment.client.stripeCustomerId;

  let session;
  try {
    session = await stripe.client.checkout.sessions.create(
      {
        mode: recurring ? 'subscription' : 'payment',
        client_reference_id: payment.id,
        line_items: [lineItem(payment)],
        metadata,
        success_url: urls.success,
        cancel_url: urls.cancel,
        ...(customer
          ? { customer }
          : payment.client.contactEmail
            ? { customer_email: payment.client.contactEmail }
            : {}),
        ...(recurring
          ? { subscription_data: { metadata } }
          : { payment_intent_data: { metadata, description: payment.description.slice(0, 250) } }),
      },
      { idempotencyKey: idempotencyKey(payment, payment.stripeCheckoutSessionId ?? null) }
    );
  } catch (err) {
    return recoverFromRace(db, stripe, payment, err as Error);
  }

  const stored = await db.payment.updateMany({
    where: { id: payment.id, stripeCheckoutSessionId: payment.stripeCheckoutSessionId ?? null },
    data: { stripeCheckoutSessionId: session.id },
  });
  if (stored.count === 0) {
    const current = await db.payment.findUnique({
      where: { id: payment.id },
      select: { stripeCheckoutSessionId: true },
    });
    if (current?.stripeCheckoutSessionId === session.id) {
      return { url: hostedUrl(session.url, STRIPE_HOST) };
    }
    await expireQuietly(stripe, session.id);
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Another payment attempt just started. Please try again.',
    });
  }
  return { url: hostedUrl(session.url, STRIPE_HOST) };
}

const isIdempotencyClash = (err: Error) =>
  (err as { type?: string }).type === 'StripeIdempotencyError' ||
  (err as { code?: string }).code === 'idempotency_key_in_use';

/**
 * Two first checkouts of one payment with different return URLs share an idempotency key and
 * Stripe refuses the second. The first one stored its session, so hand that one back.
 */
async function recoverFromRace(
  db: PrismaClient,
  stripe: StripeService,
  payment: CheckoutPayment,
  err: Error
): Promise<{ url: string }> {
  if (!isIdempotencyClash(err)) throw err;
  const current = await db.payment.findUnique({
    where: { id: payment.id },
    select: { stripeCheckoutSessionId: true },
  });
  const stored = current?.stripeCheckoutSessionId;
  if (stored && stored !== (payment.stripeCheckoutSessionId ?? null)) {
    const session = await stripe.client.checkout.sessions.retrieve(stored);
    if (session.status === 'open' && session.url)
      return { url: hostedUrl(session.url, STRIPE_HOST) };
  }
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'Another payment attempt just started. Please try again.',
  });
}

async function portalConfigurationId(stripe: StripeService): Promise<string | undefined> {
  try {
    const existing = await stripe.client.billingPortal.configurations.list({
      active: true,
      limit: 100,
    });
    const found = existing.data.find((config) => config.metadata?.ardoise === PORTAL_TAG);
    if (found) return found.id;

    const created = await stripe.client.billingPortal.configurations.create({
      metadata: { ardoise: PORTAL_TAG },
      business_profile: { headline: 'Maintenance' },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
      },
    });
    return created.id;
  } catch (err) {
    logger.warn({ err }, 'Maintenance portal configuration unavailable, using the default one');
    return undefined;
  }
}

/** Customer Portal for one maintenance subscription: card or SEPA mandate, invoices, cancellation. */
export async function createMaintenancePortal(
  db: PrismaClient,
  stripe: StripeService,
  payment: Pick<CheckoutPayment, 'spaceId' | 'stripeSubscriptionId' | 'client'>,
  returnUrl: string
): Promise<{ url: string }> {
  await requirePlatformStudio(db, payment.spaceId);
  if (!payment.stripeSubscriptionId || !payment.client.stripeCustomerId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This payment has no maintenance subscription to manage',
    });
  }

  const configuration = await portalConfigurationId(stripe);
  const session = await stripe.client.billingPortal.sessions.create({
    customer: payment.client.stripeCustomerId,
    return_url: returnUrl,
    ...(configuration ? { configuration } : {}),
  });
  return { url: hostedUrl(session.url, PORTAL_HOST) };
}
