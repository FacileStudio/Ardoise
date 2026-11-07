import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import spaceService from '../space/service';
import revenueService from './service';
import { monthRange, parisMonth, shiftMonth } from './months';

const enabled = !!process.env.TEST_DATABASE_URL;
const NOW = new Date('2026-11-15T10:00:00Z');
const at = (iso: string) => new Date(iso);

describe('months', () => {
  it('reads the month in Paris, not in UTC', () => {
    expect(parisMonth(at('2026-10-31T22:59:59Z'))).toBe('2026-10');
    expect(parisMonth(at('2026-10-31T23:00:00Z'))).toBe('2026-11');
    expect(parisMonth(at('2026-06-30T21:59:59Z'))).toBe('2026-06');
    expect(parisMonth(at('2026-06-30T22:00:00Z'))).toBe('2026-07');
  });

  it('shifts across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 2)).toBe('2027-01');
    expect(monthRange('2026-11', 3)).toEqual(['2026-11', '2026-12', '2027-01']);
  });
});

describe.skipIf(!enabled)('revenue overview against Postgres', () => {
  let release: () => Promise<void> = async () => {};
  const ids: Record<string, string> = {};

  const wipe = () =>
    prisma.$executeRawUnsafe(
      'TRUNCATE "User", "Space", "Provider", "Client", "Mission", "Document", "Payment", "AuditLog", "Settings" CASCADE'
    );

  async function seedSpace(key: string, userId: string) {
    const space = await prisma.space.create({
      data: { name: `Space ${key}`, members: { create: { userId, role: 'OWNER' } } },
    });
    const client = await prisma.client.create({
      data: {
        contactFirstName: 'C',
        contactLastName: key,
        companyName: `Client ${key}`,
        spaceId: space.id,
      },
    });
    return { spaceId: space.id, clientId: client.id, userId };
  }

  type Seed = Awaited<ReturnType<typeof seedSpace>>;

  const payment = (seed: Seed, data: Record<string, unknown>) =>
    prisma.payment.create({
      data: {
        clientId: seed.clientId,
        spaceId: seed.spaceId,
        amount: 0,
        totalWithFees: 0,
        description: 'p',
        dueDate: at('2026-12-01T00:00:00Z'),
        status: 'PENDING',
        collectionMethod: 'MANUAL',
        ...data,
      } as never,
    });

  const mission = (seed: Seed, name: string, status = 'ACCEPTED') =>
    prisma.mission.create({
      data: { name, status: status as never, clientId: seed.clientId, spaceId: seed.spaceId },
    });

  const document = (seed: Seed, data: Record<string, unknown>) =>
    prisma.document.create({
      data: {
        name: 'd.pdf',
        clientName: 'Client',
        providerName: 'Provider',
        items: [],
        subtotal: 0,
        tva: 0,
        total: 0,
        createdBy: seed.userId,
        spaceId: seed.spaceId,
        ...data,
      } as never,
    });

  const quote = (seed: Seed, missionId: string, version: number, total: number, extra = {}) =>
    document(seed, { type: 'devis', missionId, version, total, subtotal: total, ...extra });

  const invoice = (
    seed: Seed,
    number: string,
    total: number,
    extra: Record<string, unknown> = {}
  ) =>
    document(seed, {
      type: 'facture_prestation',
      invoiceNumber: number,
      total,
      subtotal: total,
      ...extra,
    });

  async function seedA(seed: Seed) {
    await payment(seed, { amount: 100.1, status: 'PAID', paidAt: at('2026-10-31T23:30:00Z') });
    await payment(seed, { amount: 0.1, status: 'PAID', paidAt: at('2026-11-02T10:00:00Z') });
    await payment(seed, { amount: 0.2, status: 'PAID', paidAt: at('2026-11-03T10:00:00Z') });
    await payment(seed, { amount: 200.2, status: 'PAID', paidAt: at('2026-09-30T22:30:00Z') });
    await payment(seed, { amount: 50, status: 'PAID', paidAt: at('2026-01-15T10:00:00Z') });
    await payment(seed, { amount: 999, status: 'PAID', paidAt: at('2025-11-20T10:00:00Z') });
    await payment(seed, { amount: 500, status: 'CANCELLED', paidAt: at('2026-11-05T10:00:00Z') });
    await payment(seed, { amount: 400, status: 'EXPIRED', paidAt: at('2026-11-05T10:00:00Z') });
    await payment(seed, { amount: 300.5, status: 'FAILED', paidAt: at('2026-11-05T10:00:00Z') });

    const subscription = await payment(seed, {
      amount: 30,
      status: 'PAID',
      paidAt: at('2026-11-10T09:00:00Z'),
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
      stripeSubscriptionId: 'sub_a1',
    });
    for (const [n, paidAt] of [
      [1, '2026-10-10T09:00:00Z'],
      [2, '2026-11-10T09:00:00Z'],
    ] as const) {
      await prisma.paymentInvoice.create({
        data: {
          paymentId: subscription.id,
          stripeInvoiceId: `in_a${n}`,
          amount: 30,
          status: 'PAID',
          paidAt: at(paidAt),
        },
      });
    }

    await payment(seed, { amount: 1000, dueDate: at('2026-11-01T00:00:00Z') });
    await payment(seed, { amount: 300, status: 'PAST_DUE', dueDate: at('2026-12-20T00:00:00Z') });
    await payment(seed, { amount: 700, dueDate: at('2026-11-20T00:00:00Z') });
    await payment(seed, { amount: 60, dueDate: at('2026-11-15T00:00:00Z') });
    await payment(seed, { amount: 11, dueDate: at('2026-11-30T23:30:00Z') });
    await payment(seed, { amount: 250, dueDate: at('2027-01-10T00:00:00Z') });
    await payment(seed, { amount: 90, dueDate: at('2028-06-01T00:00:00Z') });
    await payment(seed, { amount: 40, dueDate: at('2026-12-05T00:00:00Z'), frequency: 'MONTHLY' });
    await payment(seed, { amount: 111, status: 'CANCELLED', dueDate: at('2026-12-01T00:00:00Z') });
    await payment(seed, { amount: 222, status: 'EXPIRED', dueDate: at('2026-12-01T00:00:00Z') });

    await payment(seed, {
      amount: 600,
      status: 'PAID',
      paidAt: at('2026-03-20T10:00:00Z'),
      frequency: 'YEARLY',
      collectionMethod: 'STRIPE',
      stripeSubscriptionId: 'sub_a2',
    });
    await payment(seed, {
      amount: 10,
      status: 'PAID',
      paidAt: at('2026-08-31T10:00:00Z'),
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
      stripeSubscriptionId: 'sub_a3',
    });
    await payment(seed, {
      amount: 5,
      status: 'PAID',
      paidAt: at('2025-01-01T09:00:00Z'),
      frequency: 'MONTHLY',
    });
    await payment(seed, {
      amount: 7,
      status: 'CANCELLED',
      paidAt: at('2026-11-10T09:00:00Z'),
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
      stripeSubscriptionId: 'sub_a4',
    });

    const m1 = await mission(seed, 'M1');
    await quote(seed, m1.id, 1, 1000, { acceptedAt: at('2026-05-01T00:00:00Z') });
    await quote(seed, m1.id, 2, 2000, {
      acceptedAt: at('2026-06-01T00:00:00Z'),
      dueDate: at('2027-02-10T12:00:00Z'),
    });
    const f1 = await invoice(seed, 'F1', 600, { missionId: m1.id, invoiceKind: 'DEPOSIT' });
    await payment(seed, {
      amount: 600,
      status: 'PAID',
      paidAt: at('2025-01-01T10:00:00Z'),
      missionId: m1.id,
      documentId: f1.id,
    });

    const m2 = await mission(seed, 'M2');
    await quote(seed, m2.id, 1, 800, { acceptedAt: at('2026-05-01T00:00:00Z') });
    await payment(seed, {
      amount: 100,
      status: 'PAID',
      paidAt: at('2025-02-02T10:00:00Z'),
      missionId: m2.id,
    });

    const m3 = await mission(seed, 'M3', 'QUOTED');
    await quote(seed, m3.id, 1, 5000);

    const m4 = await mission(seed, 'M4', 'CANCELLED');
    await quote(seed, m4.id, 1, 3000, { acceptedAt: at('2026-05-01T00:00:00Z') });
    await invoice(seed, 'F4', 123, { missionId: m4.id });

    const m5 = await mission(seed, 'M5', 'INVOICED');
    await quote(seed, m5.id, 1, 500, { acceptedAt: at('2026-05-01T00:00:00Z') });
    const f5 = await invoice(seed, 'F5', 500, { missionId: m5.id, invoiceKind: 'FULL' });
    await payment(seed, {
      amount: 500,
      status: 'PAID',
      paidAt: at('2025-03-03T10:00:00Z'),
      missionId: m5.id,
      documentId: f5.id,
    });

    const m6 = await mission(seed, 'M6');
    await quote(seed, m6.id, 1, 300, {
      acceptedAt: at('2026-05-01T00:00:00Z'),
      dueDate: at('2026-10-01T10:00:00Z'),
    });

    const m7 = await mission(seed, 'M7', 'PAID');
    await quote(seed, m7.id, 1, 900, { acceptedAt: at('2026-05-01T00:00:00Z') });

    await invoice(seed, 'F7', 450, { dueDate: at('2026-12-24T12:00:00Z') });
    const f8 = await invoice(seed, 'F8', 80, { dueDate: at('2026-11-02T10:00:00Z') });
    await payment(seed, { amount: 80, status: 'CANCELLED', documentId: f8.id });
    const f9 = await invoice(seed, 'F9', 70, { dueDate: at('2026-11-25T10:00:00Z') });
    await payment(seed, { amount: 70, dueDate: at('2026-11-25T10:00:00Z'), documentId: f9.id });
  }

  async function seedB(seed: Seed) {
    await payment(seed, { amount: 77777, status: 'PAID', paidAt: at('2026-11-05T10:00:00Z') });
    await payment(seed, { amount: 5555, dueDate: at('2026-12-01T00:00:00Z') });
    await payment(seed, { amount: 4444, dueDate: at('2026-10-01T00:00:00Z') });
    const m = await mission(seed, 'MB');
    await quote(seed, m.id, 1, 12345, { acceptedAt: at('2026-05-01T00:00:00Z') });
    await invoice(seed, 'FB', 3333, { dueDate: at('2026-12-24T12:00:00Z') });
    await payment(seed, {
      amount: 8,
      status: 'PAID',
      paidAt: at('2026-11-05T10:00:00Z'),
      frequency: 'MONTHLY',
      collectionMethod: 'STRIPE',
    });
  }

  let a: Seed;
  let b: Seed;

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await wipe();
    const alice = await prisma.user.create({
      data: { email: 'alice@rev.test', firstName: 'A', lastName: 'A', role: 'MEMBER' },
    });
    const bob = await prisma.user.create({
      data: { email: 'bob@rev.test', firstName: 'B', lastName: 'B', role: 'MEMBER' },
    });
    a = await seedSpace('A', alice.id);
    b = await seedSpace('B', bob.id);
    ids.alice = alice.id;
    ids.bob = bob.id;
    await seedA(a);
    await seedB(b);
  }, 120_000);

  afterAll(async () => {
    await wipe();
    await release();
  }, 120_000);

  const overviewOf = async (userId: string, spaceId?: string) =>
    revenueService.overview(prisma, await spaceService.resolveScope(prisma, userId, spaceId), NOW);

  const monthsOf = (rows: Array<{ month: string; amount: string }>) =>
    Object.fromEntries(
      rows.filter((row) => row.amount !== '0.00').map((row) => [row.month, row.amount])
    );

  it('sums collected money by Paris month, counting a subscription by its paid invoices only', async () => {
    const { collected } = await overviewOf(ids.alice!, a.spaceId);

    expect(collected.months).toHaveLength(12);
    expect(collected.months[0]!.month).toBe('2025-12');
    expect(collected.months[11]!.month).toBe('2026-11');
    expect(monthsOf(collected.months)).toEqual({
      '2026-01': '50.00',
      '2026-03': '600.00',
      '2026-08': '10.00',
      '2026-10': '230.20',
      '2026-11': '130.40',
    });
    expect(collected.thisMonth).toBe('130.40');
    expect(collected.thisYear).toBe('1020.60');
  });

  it('splits what is left to collect into overdue and upcoming', async () => {
    const { toCollect } = await overviewOf(ids.alice!, a.spaceId);

    expect(toCollect.overdue).toEqual({ amount: '1300.00', count: 2 });
    expect(toCollect.upcoming).toEqual({ amount: '1221.00', count: 7 });
    expect(toCollect.total).toBe('2521.00');
    expect(toCollect.truncated).toBe(false);
    expect(toCollect.items).toHaveLength(9);
    expect(toCollect.items.slice(0, 2).every((item) => item.overdue)).toBe(true);
    expect(toCollect.items[0]).toMatchObject({
      amount: '1000.00',
      status: 'PENDING',
      clientName: 'Client A',
      dueDate: '2026-11-01T00:00:00.000Z',
    });
    expect(
      toCollect.items.some((item) => ['CANCELLED', 'EXPIRED', 'PAID'].includes(item.status))
    ).toBe(false);
  });

  it('forecasts open payments by due month, keeping late ones out', async () => {
    const { forecast } = await overviewOf(ids.alice!, a.spaceId);
    const scheduled = forecast.sources.scheduled;

    expect(forecast.months[0]).toBe('2026-11');
    expect(forecast.months[11]).toBe('2027-10');
    expect(monthsOf(scheduled.months)).toEqual({
      '2026-11': '830.00',
      '2026-12': '51.00',
      '2027-01': '250.00',
    });
    expect(scheduled.later).toBe('90.00');
    expect(scheduled.undated).toBe('0.00');
    expect(scheduled.total).toBe('1221.00');
  });

  it('projects active Stripe subscriptions from their last payment, inside the horizon', async () => {
    const { recurring } = (await overviewOf(ids.alice!, a.spaceId)).forecast.sources;
    const months = monthsOf(recurring.months);

    expect(months['2026-11']).toBe('10.00');
    expect(months['2026-12']).toBe('40.00');
    expect(months['2027-02']).toBe('40.00');
    expect(months['2027-03']).toBe('640.00');
    expect(months['2027-10']).toBe('40.00');
    expect(Object.keys(months)).toHaveLength(12);
    expect(recurring.later).toBe('0.00');
    expect(recurring.total).toBe('1050.00');
  });

  it('counts only the remainder of an accepted quote, and dates it by the quote date', async () => {
    const { unbilled } = (await overviewOf(ids.alice!, a.spaceId)).forecast.sources;

    expect(monthsOf(unbilled.months)).toEqual({ '2026-11': '300.00', '2027-02': '1400.00' });
    expect(unbilled.undated).toBe('700.00');
    expect(unbilled.later).toBe('0.00');
    expect(unbilled.total).toBe('2400.00');
  });

  it('adds invoices that never got a live payment, and nothing already covered', async () => {
    const { invoiced } = (await overviewOf(ids.alice!, a.spaceId)).forecast.sources;

    expect(monthsOf(invoiced.months)).toEqual({ '2026-11': '80.00', '2026-12': '450.00' });
    expect(invoiced.undated).toBe('0.00');
    expect(invoiced.total).toBe('530.00');
  });

  it('totals every source', async () => {
    const { forecast } = await overviewOf(ids.alice!, a.spaceId);

    expect(forecast.total).toBe('5201.00');
  });

  it('never mixes another space into the numbers', async () => {
    const onlyA = await overviewOf(ids.alice!, a.spaceId);
    const everything = await overviewOf(ids.alice!);
    const onlyB = await overviewOf(ids.bob!, b.spaceId);

    expect(everything).toEqual(onlyA);
    expect(JSON.stringify(onlyA)).not.toContain('Client B');
    expect(onlyA.collected.thisMonth).not.toBe(onlyB.collected.thisMonth);
    expect(onlyB.collected.thisMonth).toBe('77785.00');
    expect(onlyB.toCollect.overdue.amount).toBe('4444.00');
    expect(onlyB.toCollect.upcoming.amount).toBe('5555.00');
    expect(onlyB.forecast.sources.unbilled.undated).toBe('12345.00');
    expect(onlyB.forecast.sources.invoiced.total).toBe('3333.00');
  });

  it('refuses a space the caller does not belong to', async () => {
    await expect(overviewOf(ids.alice!, b.spaceId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('answers zeros for a member of no space', async () => {
    const loner = await prisma.user.create({
      data: { email: 'loner@rev.test', firstName: 'L', lastName: 'L', role: 'MEMBER' },
    });
    const empty = await overviewOf(loner.id);

    expect(empty.collected.thisYear).toBe('0.00');
    expect(empty.toCollect.items).toEqual([]);
    expect(empty.forecast.total).toBe('0.00');
  });
});
