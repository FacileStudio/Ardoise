import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { at, payment, seedSpace, wipe, type Seed } from './test-support';
import { monthsOf, overviewOf } from './suite';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('revenue: collected', () => {
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

  it('sums by Paris month, without float drift, and leaves out dead payments', async () => {
    const paid = (amount: number, paidAt: string, status = 'PAID') =>
      payment(seed, { amount, status, paidAt: at(paidAt) });
    await paid(100.1, '2026-10-31T23:30:00Z');
    await paid(0.1, '2026-11-02T10:00:00Z');
    await paid(0.2, '2026-11-03T10:00:00Z');
    await paid(200.2, '2026-09-30T22:30:00Z');
    await paid(50, '2026-01-15T10:00:00Z');
    await paid(999, '2025-11-20T10:00:00Z');
    await paid(500, '2026-11-05T10:00:00Z', 'CANCELLED');
    await paid(400, '2026-11-05T10:00:00Z', 'EXPIRED');
    await paid(300.5, '2026-11-05T10:00:00Z', 'FAILED');

    const { collected } = await overviewOf(seed.userId);

    expect(collected.months).toHaveLength(12);
    expect(collected.months[0]!.month).toBe('2025-12');
    expect(collected.months[11]!.month).toBe('2026-11');
    expect(monthsOf(collected.months)).toEqual({
      '2026-01': '50.00',
      '2026-10': '200.20',
      '2026-11': '100.40',
    });
    expect(collected.thisMonth).toBe('100.40');
    expect(collected.thisYear).toBe('350.60');
  });

  it('counts each paid invoice of a subscription once, and a first period no invoice covers', async () => {
    const covered = await payment(seed, {
      amount: 30,
      status: 'PAID',
      paidAt: at('2026-11-10T09:00:00Z'),
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
    });
    const uncovered = await payment(seed, {
      amount: 70,
      status: 'PAID',
      paidAt: at('2026-02-10T09:00:00Z'),
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
    });
    const record = (paymentId: string, id: string, amount: number, paidAt: string) =>
      prisma.paymentInvoice.create({
        data: { paymentId, stripeInvoiceId: id, amount, status: 'PAID', paidAt: at(paidAt) },
      });
    await record(covered.id, 'in_1', 30, '2026-10-10T09:00:00Z');
    await record(covered.id, 'in_2', 30, '2026-11-10T09:00:00Z');
    await record(uncovered.id, 'in_3', 70, '2026-03-10T09:00:00Z');

    const months = monthsOf((await overviewOf(seed.userId)).collected.months);

    expect(months['2026-10']).toBe('230.20');
    expect(months['2026-11']).toBe('130.40');
    expect(months['2026-02']).toBe('70.00');
    expect(months['2026-03']).toBe('70.00');
  });
});
