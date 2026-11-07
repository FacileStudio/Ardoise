import { describe, expect, it } from 'bun:test';
import { prisma } from '@repo/database';
import { useSpace, monthsOf, overviewOf } from './suite';
import { at, invoice, mission, payment } from './test-support';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('revenue: invoices without a payment request', () => {
  const space = useSpace();

  it('forecasts invoices not due yet, and nothing already requested or closed', async () => {
    const { seed } = space;
    await invoice(seed, 'F1', 450, { dueDate: at('2026-12-24T12:00:00Z') });
    await invoice(seed, 'F2', 60, { dueDate: at('2027-01-05T12:00:00Z') });
    const live = await invoice(seed, 'F3', 70, { dueDate: at('2026-11-25T10:00:00Z') });
    await payment(seed, { amount: 70, documentId: live.id });
    const cancelled = await invoice(seed, 'F4', 80, { dueDate: at('2026-12-02T10:00:00Z') });
    await payment(seed, { amount: 80, status: 'CANCELLED', documentId: cancelled.id });
    const paid = await invoice(seed, 'F5', 90, { dueDate: at('2026-12-03T10:00:00Z') });
    await payment(seed, {
      amount: 90,
      status: 'PAID',
      documentId: paid.id,
      paidAt: at('2026-11-01T10:00:00Z'),
    });
    const attached = await invoice(seed, 'F6', 95, { dueDate: at('2026-12-04T10:00:00Z') });
    const request = await payment(seed, { amount: 95 });
    await prisma.paymentDocument.create({
      data: { paymentId: request.id, documentId: attached.id },
    });
    await invoice(seed, 'F7', 100, { dueDate: at('2026-12-05T10:00:00Z'), source: 'imported' });
    const closed = await mission(seed, 'Closed', 'PAID');
    await invoice(seed, 'F8', 110, { dueDate: at('2026-12-06T10:00:00Z'), missionId: closed.id });
    const dead = await mission(seed, 'Dead', 'CANCELLED');
    await invoice(seed, 'F9', 120, { dueDate: at('2026-12-07T10:00:00Z'), missionId: dead.id });
    await invoice(seed, 'F10', 130, { dueDate: at('2026-11-02T10:00:00Z') });

    const { invoiced } = (await overviewOf(seed.userId)).forecast.sources;

    expect(monthsOf(invoiced.months)).toEqual({ '2026-12': '530.00', '2027-01': '60.00' });
    expect(invoiced.undated).toBe('0.00');
    expect(invoiced.total).toBe('590.00');
  });

  it('keeps an overdue invoice out of the forecast', async () => {
    const { toCollect } = await overviewOf(space.seed.userId);

    expect(toCollect.overdueInvoices).toEqual({ amount: '130.00', count: 1 });
  });
});
