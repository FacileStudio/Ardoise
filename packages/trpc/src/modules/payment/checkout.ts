import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import { logger } from '@repo/logger';
import { createHash } from 'node:crypto';
import { requirePlatformStudio } from '../space/studio';
import { isPayableStatus, expectedCents } from './amounts';

const PORTAL_TAG = 'ardoise-maintenance';
const STRIPE_HOST = 'checkout.stripe.com';
const PORTAL_HOST = 'billing.stripe.com';

export interface CheckoutPayment {
  id: string;
  spaceId: string;
  clientId: string;
  status: string;
  frequency: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  collectionMethod: 'STRIPE' | 'MANUAL';
  amount: unknown;
  totalWithFees: unknown;
  description: string;
  stripePaymentIntentId: string | null;
  stripeSubscriptionId: string | null;
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
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe returned no usable URL' });
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe returned no usable URL' });
};

const idempotencyKey = (
  payment: CheckoutPayment,
  urls: CheckoutUrls,
  customer: string | null
): string => {
  const hour = Math.floor(Date.now() / 3_600_000);
  const urlHash = createHash('sha256').update(`${urls.success}|${urls.cancel}|${customer ?? ''}|${payment.description}`).digest('hex').slice(0, 16);
  return `checkout:${payment.id}:${expectedCents(payment)}:${urlHash}:${hour}`;
};

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

async function retireLegacyObjects(
  db: PrismaClient,
  stripe: StripeService,
  payment: CheckoutPayment
): Promise<void> {
  if (payment.status !== 'PENDING') return;
  if (!payment.stripePaymentIntentId && !payment.stripeSubscriptionId) return;

  try {
    if (payment.stripePaymentIntentId) {
      await stripe.client.paymentIntents.cancel(payment.stripePaymentIntentId);
    }
    if (payment.stripeSubscriptionId) {
      await stripe.client.subscriptions.cancel(payment.stripeSubscriptionId);
    }
  } catch (err) {
    logger.warn({ err, paymentId: payment.id }, 'Could not cancel legacy Stripe object');
  }

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

  const customer = await stripe.client.customers.create(
    {
      email: payment.client.contactEmail,
      name: payment.client.companyName,
      metadata: { clientId: payment.clientId, spaceId: payment.spaceId },
    },
    { idempotencyKey: `customer:${payment.clientId}` }
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

/**
 * Starts a Stripe-hosted Checkout for one payment. Amount, currency, customer and
 * the payment id come from the database row; the caller supplies nothing but the
 * return URLs, which the server builds from FRONTEND_URL.
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

  const recurring = payment.frequency !== 'ONE_TIME';
  const metadata = { payment_id: payment.id, space_id: payment.spaceId };
  const customer = recurring
    ? await ensureCustomer(db, stripe, payment)
    : payment.client.stripeCustomerId;

  const session = await stripe.client.checkout.sessions.create(
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
    { idempotencyKey: idempotencyKey(payment, urls, customer) }
  );

  await db.payment.updateMany({
    where: { id: payment.id },
    data: { stripeCheckoutSessionId: session.id },
  });
  return { url: hostedUrl(session.url, STRIPE_HOST) };
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
