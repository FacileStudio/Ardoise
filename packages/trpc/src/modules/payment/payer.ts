import type { PrismaClient } from '@repo/database';
import { getSettingsRecord } from '../settings/service';
import { isPlatformStudio } from '../space/studio';
import { isPayableStatus, paymentReference } from './amounts';
import { paymentIssuer } from './tenant-mail';

type PayerPayment = {
  id: string;
  spaceId: string;
  documentId: string | null;
  status: string;
  frequency: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  collectionMethod: 'STRIPE' | 'MANUAL';
  amount: unknown;
  description: string;
  dueDate: Date;
  reference: string | null;
  stripeSubscriptionId: string | null;
  declaredMethod: 'TRANSFER' | 'CHEQUE' | 'OTHER' | null;
  declaredReference: string | null;
  declaredPaidOn: Date | null;
  document?: { invoiceNumber: string | null } | null;
  client: { stripeCustomerId: string | null };
};

export interface PayerView {
  reference: string;
  description: string;
  amount: number;
  currency: 'EUR';
  dueDate: string;
  status: string;
  frequency: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  issuer: string | null;
  canPayOnline: boolean;
  canDeclare: boolean;
  canManage: boolean;
  declared: { method: string; reference: string | null; paidOn: string | null } | null;
  bank: { bankName: string | null; iban: string; bic: string | null } | null;
}

/** The platform studio's own name and bank account, from the company settings. */
async function platformIssuer(db: PrismaClient) {
  const settings = await getSettingsRecord(db);
  return {
    name: settings.companyName ?? null,
    bank: settings.iban ? { bankName: settings.bankName, iban: settings.iban, bic: settings.bic } : null,
  };
}

/**
 * What a payer may see of one payment: amount, reference, issuer and the ways to
 * settle it. Never a client address, id of another record or a Stripe identifier.
 */
export async function payerView(db: PrismaClient, payment: PayerPayment): Promise<PayerView> {
  const studio = await isPlatformStudio(db, payment.spaceId);
  const issuer = studio ? await platformIssuer(db) : await paymentIssuer(db, payment);
  const payable = (studio || payment.collectionMethod === 'MANUAL') && isPayableStatus(payment.status);
  const recurring = payment.frequency !== 'ONE_TIME';

  return {
    reference: paymentReference(payment),
    description: payment.description,
    amount: Number(payment.amount),
    currency: 'EUR',
    dueDate: payment.dueDate.toISOString(),
    status: payment.status,
    frequency: payment.frequency,
    issuer: issuer.name,
    canPayOnline:
      studio &&
      payable &&
      payment.collectionMethod === 'STRIPE' &&
      (!payment.stripeSubscriptionId || payment.status === 'PENDING'),
    canDeclare: payable && !recurring,
    canManage:
      studio &&
      recurring &&
      !!payment.stripeSubscriptionId &&
      !!payment.client.stripeCustomerId &&
      payment.status !== 'CANCELLED',
    declared: payment.declaredMethod
      ? {
          method: payment.declaredMethod,
          reference: payment.declaredReference,
          paidOn: payment.declaredPaidOn?.toISOString() ?? null,
        }
      : null,
    bank: issuer.bank,
  };
}
