import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { accepted, at, invoice, mission, payment, quote, seedSpace, wipe, type Seed } from './test-support';
import { overviewOf } from './suite';

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)('revenue: isolation and roles', () => {
  let release: () => Promise<void> = async () => {};
  let a: Seed;
  let b: Seed;

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await wipe();
    a = await seedSpace('A');
    b = await seedSpace('B');
    await payment(a, { amount: 12, status: 'PAID', paidAt: at('2026-11-05T10:00:00Z') });
    await payment(b, { amount: 77777, status: 'PAID', paidAt: at('2026-11-05T10:00:00Z') });
    await payment(b, { amount: 5555, dueDate: at('2026-12-01T00:00:00Z') });
    await payment(b, { amount: 4444, dueDate: at('2026-10-01T00:00:00Z') });
    const m = await mission(b, 'MB');
    await quote(b, m.id, 1, 12345, accepted);
    await invoice(b, 'FB', 3333, { dueDate: at('2026-12-24T12:00:00Z') });
  }, 120_000);

  afterAll(async () => {
    await wipe();
    await release();
  }, 120_000);

  it('never mixes another space into the numbers', async () => {
    const onlyA = await overviewOf(a.userId);
    const onlyB = await overviewOf(b.userId, b.spaceId);

    expect(onlyA.collected.thisMonth).toBe('12.00');
    expect(onlyA.toCollect.items).toEqual([]);
    expect(onlyA.forecast.total).toBe('0.00');
    expect(JSON.stringify(onlyA)).not.toContain('Client B');
    expect(onlyB.collected.thisMonth).toBe('77777.00');
    expect(onlyB.toCollect.overdue.amount).toBe('4444.00');
    expect(onlyB.toCollect.upcoming.amount).toBe('5555.00');
    expect(onlyB.forecast.sources.unbilled.undated).toBe('12345.00');
    expect(onlyB.forecast.sources.invoiced.total).toBe('3333.00');
  });

  it('refuses a space the caller does not belong to', async () => {
    await expect(overviewOf(a.userId, b.spaceId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses a plain member of the space, and shows a member nothing across spaces', async () => {
    await prisma.spaceMember.update({
      where: { spaceId_userId: { spaceId: b.spaceId, userId: b.userId } },
      data: { role: 'MEMBER' },
    });

    await expect(overviewOf(b.userId, b.spaceId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const all = await overviewOf(b.userId);
    expect(all.collected.thisMonth).toBe('0.00');
    expect(all.toCollect.items).toEqual([]);

    await prisma.spaceMember.update({
      where: { spaceId_userId: { spaceId: b.spaceId, userId: b.userId } },
      data: { role: 'ADMIN' },
    });
    expect((await overviewOf(b.userId, b.spaceId)).collected.thisMonth).toBe('77777.00');
  });

  it('answers zeros for a member of no space', async () => {
    const loner = await prisma.user.create({
      data: { email: 'loner@rev.test', firstName: 'L', lastName: 'L', role: 'MEMBER' },
    });
    const empty = await overviewOf(loner.id);

    expect(empty.collected.thisYear).toBe('0.00');
    expect(empty.forecast.total).toBe('0.00');
  });
});
