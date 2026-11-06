import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { PaymentStatus, PrismaClient } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import { createMaintenancePortal, createPaymentCheckout } from '../payment/checkout';
import { payerView } from '../payment/payer';
import { requireClient } from './service';

export const PortalPaymentIdSchema = z.object({ paymentId: z.string().min(1).max(64) });

const OPEN: PaymentStatus[] = [
  'PENDING',
  'PAST_DUE',
  'FAILED',
  'EXPIRED',
  'PROCESSING',
  'AWAITING_CONFIRMATION',
];

/** A payment of the caller's own Client and space, or NOT_FOUND. Nothing else is reachable. */
export async function ownPayment(db: PrismaClient, userId: string, paymentId: string) {
  const client = await requireClient(db, userId);
  const payment = await db.payment.findFirst({
    where: { id: paymentId, clientId: client.id, spaceId: client.spaceId },
    include: { client: true, document: { select: { invoiceNumber: true } } },
  });
  if (!payment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' });
  return payment;
}

/** Open invoice payments and live maintenance subscriptions of the caller's own Client. */
export async function listOwnPayments(db: PrismaClient, userId: string) {
  const client = await requireClient(db, userId);
  const payments = await db.payment.findMany({
    where: {
      clientId: client.id,
      spaceId: client.spaceId,
      OR: [
        { status: { in: OPEN } },
        { frequency: { not: 'ONE_TIME' }, status: { not: 'CANCELLED' } },
      ],
    },
    orderBy: { dueDate: 'asc' },
    include: { client: true, document: { select: { invoiceNumber: true } } },
  });

  return Promise.all(
    payments.map(async (payment) => ({ id: payment.id, ...(await payerView(db, payment)) }))
  );
}

const returnUrls = (frontendUrl: string) => {
  const base = `${frontendUrl.replace(/\/$/, '')}/app`;
  return { success: `${base}?payment=success`, cancel: `${base}?payment=cancelled` };
};

export async function startOwnCheckout(
  db: PrismaClient,
  stripe: StripeService,
  userId: string,
  paymentId: string,
  frontendUrl: string
) {
  const payment = await ownPayment(db, userId, paymentId);
  return createPaymentCheckout(db, stripe, payment, returnUrls(frontendUrl));
}

export async function openOwnMaintenancePortal(
  db: PrismaClient,
  stripe: StripeService,
  userId: string,
  paymentId: string,
  frontendUrl: string
) {
  const payment = await ownPayment(db, userId, paymentId);
  return createMaintenancePortal(db, stripe, payment, `${frontendUrl.replace(/\/$/, '')}/app`);
}
