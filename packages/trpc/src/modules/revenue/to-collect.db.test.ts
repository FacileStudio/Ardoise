import { describe, expect, it } from 'bun:test';
import { useSpace, overviewOf } from './suite';
import { at, invoice, mission, payment } from './test-support';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('revenue: to collect', () => {
  const space = useSpace();

  it('splits open payments into overdue and upcoming, and lists them', async () => {
    const { seed } = space;
    const open = (amount: number, dueDate: string, extra = {}) =>
      payment(seed, { amount, dueDate: at(dueDate), ...extra });
    await open(1000, '2026-11-01T00:00:00Z');
    await open(300, '2026-12-20T00:00:00Z', { status: 'PAST_DUE' });
    await open(700, '2026-11-20T00:00:00Z');
    await open(60, '2026-11-15T00:00:00Z');
    await open(11, '2026-11-30T23:30:00Z');
    await open(111, '2026-12-01T00:00:00Z', { status: 'CANCELLED' });
    await open(222, '2026-12-01T00:00:00Z', { status: 'EXPIRED' });
    await open(333, '2026-12-01T00:00:00Z', { status: 'PAID', paidAt: at('2026-11-01T00:00:00Z') });

    const { toCollect } = await overviewOf(seed.userId);

    expect(toCollect.overdue).toEqual({ amount: '1300.00', count: 2 });
    expect(toCollect.upcoming).toEqual({ amount: '771.00', count: 3 });
    expect(toCollect.total).toBe('2071.00');
    expect(toCollect.items).toHaveLength(5);
    expect(toCollect.items[0]).toMatchObject({
      amount: '1000.00',
      status: 'PENDING',
      clientName: 'Client A',
      dueDate: '2026-11-01T00:00:00.000Z',
      overdue: true,
    });
    expect(
      toCollect.items.some((item) => ['CANCELLED', 'EXPIRED', 'PAID'].includes(item.status))
    ).toBe(false);
  });

  it('counts overdue invoices under overdue and very old ones apart', async () => {
    const { seed } = space;
    await invoice(seed, 'F1', 400, { dueDate: at('2026-10-01T10:00:00Z') });
    await invoice(seed, 'F2', 25, { dueDate: at('2025-11-16T10:00:00Z') });
    await invoice(seed, 'F3', 9000, { dueDate: at('2024-01-01T10:00:00Z') });
    const cancelled = await mission(seed, 'Cancelled', 'CANCELLED');
    await invoice(seed, 'F4', 5000, {
      dueDate: at('2026-10-01T10:00:00Z'),
      missionId: cancelled.id,
    });

    const { toCollect } = await overviewOf(seed.userId);

    expect(toCollect.overdueInvoices).toEqual({ amount: '425.00', count: 2 });
    expect(toCollect.overdue).toEqual({ amount: '1725.00', count: 4 });
    expect(toCollect.veryLate).toEqual({ amount: '9000.00', count: 1 });
    expect(toCollect.total).toBe('2496.00');
  });
});
