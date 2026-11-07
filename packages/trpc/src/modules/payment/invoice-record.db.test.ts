import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import type Stripe from 'stripe';
import { payment, seedSpace, wipe, type Seed } from '../revenue/test-support';
import { recordInvoice, type EventDeps } from './events';

const enabled = !!process.env.TEST_DATABASE_URL;

const recordPaymentInvoice = (
  db: typeof prisma,
  paymentId: string,
  invoice: Stripe.Invoice,
  status: 'PAID' | 'FAILED'
) => recordInvoice({ db } as EventDeps, paymentId, invoice, status);

describe.skipIf(!enabled)('recordPaymentInvoice', () => {
  let release: () => Promise<void> = async () => {};
  let seed: Seed;

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await wipe();
    seed = await seedSpace('A');
  }, 120_000);

  afterAll(async () => {
    await wipe();
    await release();
  }, 120_000);

  it('keeps the first paidAt when Stripe redelivers the same invoice', async () => {
    const row = await payment(seed, {
      amount: 30,
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
    });
    const invoice = { id: 'in_redeliver', amount_paid: 3000, amount_due: 3000 } as Stripe.Invoice;

    await recordPaymentInvoice(prisma, row.id, invoice, 'PAID');
    const first = await prisma.paymentInvoice.findUniqueOrThrow({
      where: { stripeInvoiceId: 'in_redeliver' },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await recordPaymentInvoice(prisma, row.id, invoice, 'PAID');
    const second = await prisma.paymentInvoice.findUniqueOrThrow({
      where: { stripeInvoiceId: 'in_redeliver' },
    });

    expect(first.paidAt).not.toBeNull();
    expect(second.paidAt?.getTime()).toBe(first.paidAt?.getTime());
  });

  it('sets paidAt when a failed invoice is later paid', async () => {
    const row = await payment(seed, {
      amount: 30,
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
    });
    const invoice = { id: 'in_retry', amount_paid: 3000, amount_due: 3000 } as Stripe.Invoice;

    await recordPaymentInvoice(prisma, row.id, invoice, 'FAILED');
    await recordPaymentInvoice(prisma, row.id, invoice, 'PAID');
    const paid = await prisma.paymentInvoice.findUniqueOrThrow({
      where: { stripeInvoiceId: 'in_retry' },
    });

    expect(paid.status).toBe('PAID');
    expect(paid.paidAt).not.toBeNull();
  });
});
