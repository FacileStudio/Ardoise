import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { StripeService } from '@repo/stripe';
import { EmailTemplates, type SMTPClient } from '@repo/smtp';
import { logger } from '@repo/logger';
import { requireRowScope } from '../space/service';
import { requirePlatformStudio } from '../space/studio';
import { syncMissionPaid } from '../mission/sync';
import { isOverdue } from './overdue';
import { PAYABLE_STATUSES, paymentReference } from './amounts';

export const DeclarePaymentSchema = z.object({
  method: z.enum(['TRANSFER', 'CHEQUE', 'OTHER']),
  reference: z.string().trim().max(120).optional(),
  paidOn: z.coerce
    .date()
    .min(new Date('2000-01-01'))
    .refine((date) => date.getTime() <= Date.now() + 24 * 60 * 60 * 1000, 'Date is in the future')
    .optional(),
});

export type DeclarePaymentInput = z.infer<typeof DeclarePaymentSchema>;

export interface Actor {
  userId: string | null;
  via: 'portal' | 'link' | 'admin';
  ipAddress?: string;
  userAgent?: string;
}

interface DeclarablePayment {
  id: string;
  spaceId: string;
  frequency: string;
}

async function audit(
  db: PrismaClient,
  actor: Actor,
  paymentId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: actor.userId,
      entity: 'payment',
      entityId: paymentId,
      action: 'UPDATE',
      changes: { ...changes, via: actor.via } as object,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    },
  });
}

/** The client says they paid another way. The payment waits for an admin to confirm it. */
export async function declarePayment(
  db: PrismaClient,
  payment: DeclarablePayment,
  input: DeclarePaymentInput,
  actor: Actor
): Promise<void> {
  await requirePlatformStudio(db, payment.spaceId);
  if (payment.frequency !== 'ONE_TIME') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only one-time payments can be declared' });
  }

  const claimed = await db.payment.updateMany({
    where: { id: payment.id, status: { in: [...PAYABLE_STATUSES] } },
    data: {
      status: 'AWAITING_CONFIRMATION',
      declaredMethod: input.method,
      declaredReference: input.reference || null,
      declaredPaidOn: input.paidOn ?? null,
      declaredAt: new Date(),
      declaredVia: actor.via,
    },
  });
  if (claimed.count === 0) {
    throw new TRPCError({ code: 'CONFLICT', message: 'This payment can no longer be declared' });
  }

  await audit(db, actor, payment.id, {
    event: 'payment.declared',
    method: input.method,
    reference: input.reference ?? null,
    paidOn: input.paidOn?.toISOString() ?? null,
  });
}

export async function expireCheckoutSession(
  getStripe: () => Promise<StripeService>,
  sessionId: string | null
): Promise<void> {
  if (!sessionId) return;
  try {
    const stripe = await getStripe();
    await stripe.client.checkout.sessions.expire(sessionId);
  } catch (err) {
    logger.debug({ err }, 'Checkout session was not expired');
  }
}

export async function confirmDeclared(
  db: PrismaClient,
  userId: string,
  id: string,
  actor: Actor
) {
  const payment = await requireRowScope(
    db,
    userId,
    await db.payment.findUnique({ where: { id } }),
    'Payment not found'
  );

  const claimed = await db.payment.updateMany({
    where: { id, status: 'AWAITING_CONFIRMATION' },
    data: {
      status: 'PAID',
      collectionMethod: 'MANUAL',
      paidAt: payment.declaredPaidOn ?? new Date(),
    },
  });
  if (claimed.count === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No declared payment to confirm' });
  }

  await syncMissionPaid(db, payment.missionId);
  await audit(db, actor, id, { event: 'payment.declaration.confirmed' });
  return db.payment.findUniqueOrThrow({ where: { id } });
}

export async function rejectDeclared(
  db: PrismaClient,
  userId: string,
  id: string,
  reason: string | undefined,
  actor: Actor
) {
  const payment = await requireRowScope(
    db,
    userId,
    await db.payment.findUnique({ where: { id } }),
    'Payment not found'
  );

  const claimed = await db.payment.updateMany({
    where: { id, status: 'AWAITING_CONFIRMATION' },
    data: {
      status: isOverdue(payment.dueDate) ? 'PAST_DUE' : 'PENDING',
      declaredMethod: null,
      declaredReference: null,
      declaredPaidOn: null,
      declaredAt: null,
      declaredVia: null,
    },
  });
  if (claimed.count === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'No declared payment to reject' });
  }

  await audit(db, actor, id, {
    event: 'payment.declaration.rejected',
    reason: reason ?? null,
    was: {
      method: payment.declaredMethod,
      reference: payment.declaredReference,
      paidOn: payment.declaredPaidOn?.toISOString() ?? null,
    },
  });
  return db.payment.findUniqueOrThrow({ where: { id } });
}

/** Tells the space members a client declared a payment. A mail failure never fails the declaration. */
export async function notifyDeclared(
  db: PrismaClient,
  getSmtp: () => Promise<SMTPClient>,
  paymentId: string,
  frontendUrl: string
): Promise<void> {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { client: true, document: { select: { invoiceNumber: true } } },
    });
    if (!payment?.declaredMethod) return;

    const members = await db.spaceMember.findMany({
      where: { spaceId: payment.spaceId },
      select: { user: { select: { email: true } } },
    });
    const recipients = members.map((member) => member.user.email).filter(Boolean);
    if (recipients.length === 0) return;

    const templates = new EmailTemplates(await getSmtp());
    await templates.sendPaymentDeclared({
      to: recipients,
      clientName: payment.client.companyName,
      amount: Number(payment.amount),
      method: payment.declaredMethod,
      reference: payment.declaredReference ?? undefined,
      paidOn: payment.declaredPaidOn ?? undefined,
      paymentReference: paymentReference(payment),
      adminLink: `${frontendUrl.replace(/\/$/, '')}/admin/payments/${payment.id}`,
    });
  } catch (err) {
    logger.error({ err, paymentId }, 'Failed to notify admins of a declared payment');
  }
}
