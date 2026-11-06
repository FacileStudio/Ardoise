import type { Payment, Prisma, PrismaClient } from '@repo/database';
import type Stripe from 'stripe';
import { logger } from '@repo/logger';
import { syncMissionPaid } from '../mission/sync';
import { isOverdue } from './overdue';
import { CLAIMABLE_STATUSES, PAYABLE_STATUSES, legacyCents } from './amounts';

export interface EventDeps {
  db: PrismaClient;
  sendReceipt: (paymentId: string) => Promise<void>;
}

type Extra = Prisma.PaymentUpdateManyMutationInput;

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === 'string' ? value : (value?.id ?? null);

const subscriptionIdFromInvoice = (invoice: Stripe.Invoice): string | null =>
  idOf(invoice.parent?.subscription_details?.subscription);

const alert = (type: string, details: Record<string, unknown>) =>
  logger.error({ type, ...details }, 'Stripe event needs a human look');

/**
 * Marks a payment PAID exactly once. The conditional update is the claim: only the
 * delivery that flips the status mails the receipt, so replays and the several
 * events one payment produces cannot send it twice.
 */
export async function settlePayment(deps: EventDeps, payment: Payment, extra: Extra = {}): Promise<boolean> {
  const claimed = await deps.db.payment.updateMany({
    where: { id: payment.id, status: { in: [...CLAIMABLE_STATUSES] } },
    data: { ...extra, status: 'PAID', paidAt: new Date() },
  });
  if (claimed.count === 0) return false;

  await syncMissionPaid(deps.db, payment.missionId);
  if (!payment.receiptUrl) await deps.sendReceipt(payment.id);
  return true;
}

async function markProcessing(deps: EventDeps, payment: Payment, extra: Extra): Promise<void> {
  await deps.db.payment.updateMany({
    where: { id: payment.id, status: { in: [...PAYABLE_STATUSES] } },
    data: { ...extra, status: 'PROCESSING' },
  });
}

function sessionProblem(payment: Payment, session: Stripe.Checkout.Session): string | null {
  const recurring = payment.frequency !== 'ONE_TIME';
  if (session.metadata?.space_id !== payment.spaceId) return 'space mismatch';
  if (session.mode !== (recurring ? 'subscription' : 'payment')) return 'mode mismatch';
  if (session.currency !== 'eur') return 'currency mismatch';
  if (!legacyCents(payment).includes(session.amount_total ?? -1)) return 'amount mismatch';
  return null;
}

async function paymentOfSession(deps: EventDeps, session: Stripe.Checkout.Session) {
  const id = session.metadata?.payment_id;
  if (!id || session.client_reference_id !== id) return null;
  return deps.db.payment.findUnique({ where: { id } });
}

function sessionExtra(session: Stripe.Checkout.Session): Extra {
  const intent = idOf(session.payment_intent);
  const subscription = idOf(session.subscription);
  return {
    stripeCheckoutSessionId: session.id,
    ...(intent ? { stripePaymentIntentId: intent } : {}),
    ...(subscription ? { stripeSubscriptionId: subscription } : {}),
  };
}

async function flagClosedPayment(deps: EventDeps, payment: Payment, session: Stripe.Checkout.Session) {
  const current = await deps.db.payment.findUnique({ where: { id: payment.id } });
  const intent = idOf(session.payment_intent);
  if (session.mode === 'payment' && current && intent !== current.stripePaymentIntentId) {
    alert('payment-received-twice', { paymentId: payment.id, status: current.status, intent });
  }
}

async function onSessionPaid(deps: EventDeps, session: Stripe.Checkout.Session): Promise<void> {
  if (!session.metadata?.payment_id) return;
  const payment = await paymentOfSession(deps, session);
  if (!payment) return alert('payment-unknown', { session: session.id });

  const problem = sessionProblem(payment, session);
  if (problem) return alert('payment-mismatch', { paymentId: payment.id, session: session.id, problem });

  if (!(await settlePayment(deps, payment, sessionExtra(session)))) {
    await flagClosedPayment(deps, payment, session);
  }
}

async function onSessionCompleted(deps: EventDeps, session: Stripe.Checkout.Session): Promise<void> {
  if (!session.metadata?.payment_id) return;
  if (session.payment_status !== 'unpaid') return onSessionPaid(deps, session);

  const payment = await paymentOfSession(deps, session);
  if (!payment) return alert('payment-unknown', { session: session.id });
  const problem = sessionProblem(payment, session);
  if (problem) return alert('payment-mismatch', { paymentId: payment.id, session: session.id, problem });
  await markProcessing(deps, payment, sessionExtra(session));
}

async function onSessionFailed(deps: EventDeps, session: Stripe.Checkout.Session): Promise<void> {
  const payment = await paymentOfSession(deps, session);
  if (!payment) return;
  await deps.db.payment.updateMany({
    where: { id: payment.id, status: 'PROCESSING' },
    data: { status: isOverdue(payment.dueDate) ? 'PAST_DUE' : 'PENDING' },
  });
}

async function paymentOfInvoice(deps: EventDeps, invoice: Stripe.Invoice) {
  const subscription = subscriptionIdFromInvoice(invoice);
  const tagged = invoice.parent?.subscription_details?.metadata?.payment_id;
  const where: Prisma.PaymentWhereInput[] = [];
  if (subscription) where.push({ stripeSubscriptionId: subscription });
  if (tagged) where.push({ id: tagged });
  if (where.length === 0) return null;
  return deps.db.payment.findFirst({ where: { OR: where } });
}

async function recordInvoice(
  deps: EventDeps,
  paymentId: string,
  invoice: Stripe.Invoice,
  status: 'PAID' | 'FAILED'
): Promise<void> {
  if (!invoice.id) return;
  const cents = status === 'PAID' ? invoice.amount_paid : invoice.amount_due;
  const data = {
    amount: (cents ?? 0) / 100,
    status,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    paidAt: status === 'PAID' ? new Date() : null,
  };
  try {
    await deps.db.paymentInvoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: { paymentId, stripeInvoiceId: invoice.id, ...data },
      update: data,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to record subscription invoice');
  }
}

async function onInvoicePaid(deps: EventDeps, invoice: Stripe.Invoice): Promise<void> {
  const payment = await paymentOfInvoice(deps, invoice);
  if (!payment) return;

  if (invoice.currency !== 'eur' || !legacyCents(payment).includes(invoice.amount_paid)) {
    return alert('payment-mismatch', { paymentId: payment.id, invoice: invoice.id, problem: 'invoice amount' });
  }

  await recordInvoice(deps, payment.id, invoice, 'PAID');
  const subscription = subscriptionIdFromInvoice(invoice);
  await settlePayment(deps, payment, {
    stripeInvoiceId: invoice.id ?? null,
    ...(subscription && !payment.stripeSubscriptionId ? { stripeSubscriptionId: subscription } : {}),
  });
}

async function onInvoiceFailed(deps: EventDeps, invoice: Stripe.Invoice): Promise<void> {
  const payment = await paymentOfInvoice(deps, invoice);
  if (!payment) return;

  await recordInvoice(deps, payment.id, invoice, 'FAILED');
  await deps.db.payment.updateMany({
    where: { id: payment.id, status: { in: ['PENDING', 'PAID', 'PAST_DUE', 'PROCESSING'] } },
    data: { status: 'PAST_DUE', stripeInvoiceId: invoice.id ?? null },
  });
}

async function onIntentSucceeded(deps: EventDeps, intent: Stripe.PaymentIntent): Promise<void> {
  const payment = await deps.db.payment.findUnique({ where: { stripePaymentIntentId: intent.id } });
  if (!payment) return;

  const accepted = legacyCents(payment).includes(intent.amount_received) && intent.currency === 'eur';
  if (!accepted) {
    return alert('payment-mismatch', { paymentId: payment.id, intent: intent.id, problem: 'intent amount' });
  }
  await settlePayment(deps, payment);
}

async function onSubscriptionUpdated(deps: EventDeps, subscription: Stripe.Subscription): Promise<void> {
  if (subscription.status !== 'past_due' && subscription.status !== 'unpaid') return;
  await deps.db.payment.updateMany({
    where: { stripeSubscriptionId: subscription.id, status: { not: 'CANCELLED' } },
    data: { status: 'PAST_DUE' },
  });
}

export const PAYMENT_EVENT_TYPES = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

export async function processPaymentEvent(deps: EventDeps, event: Stripe.Event): Promise<void> {
  const object = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
      return onSessionCompleted(deps, object as Stripe.Checkout.Session);
    case 'checkout.session.async_payment_succeeded':
      return onSessionPaid(deps, object as Stripe.Checkout.Session);
    case 'checkout.session.async_payment_failed':
      return onSessionFailed(deps, object as Stripe.Checkout.Session);
    case 'payment_intent.succeeded':
      return onIntentSucceeded(deps, object as Stripe.PaymentIntent);
    case 'payment_intent.payment_failed':
      await deps.db.payment.updateMany({
        where: { stripePaymentIntentId: (object as Stripe.PaymentIntent).id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      return;
    case 'invoice.payment_succeeded':
      return onInvoicePaid(deps, object as Stripe.Invoice);
    case 'invoice.payment_failed':
      return onInvoiceFailed(deps, object as Stripe.Invoice);
    case 'customer.subscription.updated':
      return onSubscriptionUpdated(deps, object as Stripe.Subscription);
    case 'customer.subscription.deleted':
      await deps.db.payment.updateMany({
        where: { stripeSubscriptionId: (object as Stripe.Subscription).id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      });
      return;
    default:
  }
}
