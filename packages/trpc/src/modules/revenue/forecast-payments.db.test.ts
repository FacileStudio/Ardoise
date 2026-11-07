import { describe, expect, it } from 'bun:test';
import { useSpace, monthsOf, overviewOf } from './suite';
import { at, payment } from './test-support';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('revenue: forecast of payments', () => {
  const space = useSpace();

  it('puts open payments in their due month and keeps late ones out', async () => {
    const { seed } = space;
    const open = (amount: number, dueDate: string, extra = {}) =>
      payment(seed, { amount, dueDate: at(dueDate), ...extra });
    await open(1000, '2026-11-01T00:00:00Z');
    await open(300, '2026-12-20T00:00:00Z', { status: 'PAST_DUE' });
    await open(760, '2026-11-20T00:00:00Z');
    await open(11, '2026-11-30T23:30:00Z');
    await open(250, '2027-01-10T00:00:00Z');
    await open(90, '2028-06-01T00:00:00Z');
    await open(222, '2026-12-01T00:00:00Z', { status: 'EXPIRED' });

    const { forecast } = await overviewOf(seed.userId);
    const { scheduled } = forecast.sources;

    expect(forecast.months[0]).toBe('2026-11');
    expect(forecast.months[11]).toBe('2027-10');
    expect(monthsOf(scheduled.months)).toEqual({
      '2026-11': '760.00',
      '2026-12': '11.00',
      '2027-01': '250.00',
    });
    expect(scheduled.later).toBe('90.00');
    expect(scheduled.total).toBe('1111.00');
  });

  it('projects live series by card or transfer, and nothing for cancelled or stale ones', async () => {
    const { seed } = space;
    const series = (amount: number, paidAt: string, extra = {}) =>
      payment(seed, { amount, status: 'PAID', paidAt: at(paidAt), frequency: 'MONTHLY', ...extra });
    await series(30, '2026-11-10T09:00:00Z', { collectionMethod: 'STRIPE' });
    await series(5, '2026-11-12T09:00:00Z', { collectionMethod: 'MANUAL' });
    await series(3, '2026-10-10T09:00:00Z', { collectionMethod: 'MANUAL' });
    await series(600, '2026-03-20T10:00:00Z', { collectionMethod: 'STRIPE', frequency: 'YEARLY' });
    await series(7, '2026-11-10T09:00:00Z', { status: 'CANCELLED' });
    await series(9, '2026-11-10T09:00:00Z', { status: 'PENDING', paidAt: null });
    await series(10, '2026-08-31T10:00:00Z', { collectionMethod: 'STRIPE' });
    await series(8, '2025-03-01T10:00:00Z', { collectionMethod: 'MANUAL' });
    await series(4, '2026-10-05T10:00:00Z', { collectionMethod: 'MANUAL' });

    const overview = await overviewOf(seed.userId);
    const { recurring } = overview.forecast.sources;
    const months = monthsOf(recurring.months);

    expect(months['2026-11']).toBeUndefined();
    expect(months['2026-12']).toBe('38.00');
    expect(months['2027-03']).toBe('638.00');
    expect(months['2027-10']).toBe('38.00');
    expect(Object.keys(months)).toHaveLength(11);
    expect(recurring.later).toBe('0.00');
    expect(recurring.total).toBe('1018.00');
    expect(overview.toCollect.staleRecurring).toEqual({ amount: '22.00', count: 3 });
  });
});
