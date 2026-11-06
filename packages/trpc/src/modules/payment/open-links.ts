import type { PaymentStatus, PrismaClient } from '@repo/database';
import { EmailTemplates, type SMTPClient } from '@repo/smtp';
import { logger } from '@repo/logger';
import { issuePaymentLink } from './link';
import { paymentReference } from './amounts';

const OPEN: PaymentStatus[] = ['PENDING', 'PAST_DUE', 'EXPIRED', 'FAILED'];

export interface OpenLinksResult {
  considered: number;
  sent: number;
  skipped: Array<{ paymentId: string; why: string }>;
}

/**
 * Issues a pay link and mails a reminder for every open Stripe payment of a platform
 * studio space, overdue ones included. Meant to run once after the move to pay links, so
 * payments created before it get a link. Without `apply` it only reports.
 */
export async function sendOpenPaymentLinks(
  db: PrismaClient,
  smtp: SMTPClient,
  frontendUrl: string,
  options: { apply: boolean }
): Promise<OpenLinksResult> {
  const payments = await db.payment.findMany({
    where: {
      collectionMethod: 'STRIPE',
      status: { in: OPEN },
      frequency: { in: ['ONE_TIME', 'MONTHLY', 'YEARLY'] },
      space: { platformStudio: true },
    },
    include: {
      client: { include: { user: { select: { email: true } } } },
      document: { select: { invoiceNumber: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const result: OpenLinksResult = { considered: payments.length, sent: 0, skipped: [] };
  const templates = new EmailTemplates(smtp);

  for (const payment of payments) {
    const email = payment.client.contactEmail || payment.client.user?.email;
    if (!email) {
      result.skipped.push({ paymentId: payment.id, why: 'client has no email' });
      continue;
    }
    if (payment.stripeSubscriptionId && payment.status !== 'PENDING') {
      result.skipped.push({ paymentId: payment.id, why: 'live subscription, managed in the portal' });
      continue;
    }
    if (!options.apply) {
      result.sent += 1;
      continue;
    }

    try {
      const link = await issuePaymentLink(db, payment.id, frontendUrl);
      await templates.sendPaymentReminder({
        clientEmail: email,
        paymentLink: link.url,
        amount: Number(payment.amount),
        dueDate: payment.dueDate,
        clientName: `${payment.client.contactFirstName} ${payment.client.contactLastName}`.trim(),
        invoiceNumber: paymentReference(payment),
        daysUntilDue: Math.max(0, Math.ceil((payment.dueDate.getTime() - Date.now()) / 86_400_000)),
      });
      await db.payment.update({
        where: { id: payment.id },
        data: { lastReminderSentAt: new Date(), reminderCount: { increment: 1 } },
      });
      result.sent += 1;
    } catch (err) {
      logger.error({ err, paymentId: payment.id }, 'Failed to send an open payment link');
      result.skipped.push({ paymentId: payment.id, why: 'send failed' });
    }
  }
  return result;
}
