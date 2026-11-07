import { describe, expect, it } from 'bun:test';
import { useSpace, monthsOf, overviewOf } from './suite';
import { accepted, at, document, invoice, mission, payment, quote } from './test-support';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('revenue: accepted work not invoiced', () => {
  const space = useSpace();

  it('uses the latest quote only when it is accepted, and skips closed missions', async () => {
    const { seed } = space;
    const m1 = await mission(seed, 'Versions');
    await quote(seed, m1.id, 1, 1000, accepted);
    await quote(seed, m1.id, 2, 2000, { ...accepted, dueDate: at('2027-02-10T12:00:00Z') });
    const m2 = await mission(seed, 'Pending', 'QUOTED');
    await quote(seed, m2.id, 1, 5000);
    const m3 = await mission(seed, 'Cancelled', 'CANCELLED');
    await quote(seed, m3.id, 1, 3000, accepted);
    const m4 = await mission(seed, 'Closed', 'PAID');
    await quote(seed, m4.id, 1, 900, accepted);
    const m5 = await mission(seed, 'Past date');
    await quote(seed, m5.id, 1, 300, { ...accepted, dueDate: at('2026-10-01T10:00:00Z') });

    const { unbilled } = (await overviewOf(seed.userId)).forecast.sources;

    expect(monthsOf(unbilled.months)).toEqual({ '2026-11': '300.00', '2027-02': '2000.00' });
    expect(unbilled.undated).toBe('0.00');
    expect(unbilled.total).toBe('2300.00');
  });

  it('subtracts invoices, advances and one-time payments without a document, never maintenance', async () => {
    const { seed } = space;
    const m = await mission(seed, 'Partial');
    await quote(seed, m.id, 1, 10_000, accepted);
    const deposit = await invoice(seed, 'F1', 2000, { missionId: m.id, invoiceKind: 'DEPOSIT' });
    await payment(seed, { amount: 2000, status: 'PAID', documentId: deposit.id, missionId: m.id });
    const call = await document(seed, { type: 'appel_de_fonds', missionId: m.id });
    await payment(seed, { amount: 1000, status: 'PENDING', documentId: call.id, missionId: m.id });
    await payment(seed, {
      amount: 500,
      status: 'PAID',
      missionId: m.id,
      paidAt: at('2026-01-01T10:00:00Z'),
    });
    await payment(seed, { amount: 400, status: 'CANCELLED', missionId: m.id });
    await payment(seed, {
      amount: 99,
      status: 'PAID',
      frequency: 'MONTHLY',
      missionId: m.id,
      paidAt: at('2026-01-01T10:00:00Z'),
    });
    const upkeep = await document(seed, { type: 'maintenance', missionId: m.id });
    await payment(seed, {
      amount: 77,
      status: 'PAID',
      documentId: upkeep.id,
      missionId: m.id,
      paidAt: at('2026-01-01T10:00:00Z'),
    });

    const { unbilled } = (await overviewOf(seed.userId)).forecast.sources;

    expect(unbilled.undated).toBe('6500.00');
  });

  it('counts nothing once the quote is fully invoiced', async () => {
    const { seed } = space;
    const m = await mission(seed, 'Done', 'INVOICED');
    await quote(seed, m.id, 1, 500, accepted);
    await invoice(seed, 'F9', 500, { missionId: m.id, invoiceKind: 'FULL' });

    const { unbilled } = (await overviewOf(seed.userId)).forecast.sources;

    expect(unbilled.undated).toBe('6500.00');
    expect(unbilled.total).toBe('8800.00');
  });
});
