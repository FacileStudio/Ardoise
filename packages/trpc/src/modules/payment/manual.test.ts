import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import { paymentRouter } from './router';

function setup(payment: Record<string, unknown> = {}) {
  const created: any[] = [];
  const updated: any[] = [];
  const deleted: string[] = [];
  const missionUpdates: any[] = [];
  const row = {
    id: 'pay-1',
    clientId: 'c-1',
    spaceId: 'space-a',
    missionId: 'm-1',
    amount: 100,
    status: 'PENDING',
    collectionMethod: 'MANUAL',
    dueDate: new Date('2999-01-01'),
    ...payment,
  };
  const db: any = {
    payment: {
      findUnique: async () => row,
      create: async (args: any) => {
        created.push(args.data);
        return { id: 'pay-1', ...args.data };
      },
      update: async (args: any) => {
        updated.push(args.data);
        return { ...row, ...args.data };
      },
      delete: async (args: any) => {
        deleted.push(args.where.id);
        return row;
      },
    },
    client: {
      findUnique: async () => ({ id: 'c-1', spaceId: 'space-a', contactEmail: null, user: null }),
    },
    mission: {
      findFirst: async () => ({ id: 'm-1' }),
      updateMany: async (args: any) => {
        missionUpdates.push(args);
        return { count: 1 };
      },
    },
    document: { findFirst: async () => null, findMany: async () => [] },
    spaceMember: { findUnique: async () => ({ role: 'MEMBER' }), findMany: async () => [{ spaceId: 'space-a' }] },
  };
  const ctx = {
    db: db as PrismaClient,
    user: { id: 'user-1', role: 'ADMIN', email: 'a@b.c' },
    log: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
    env: {},
  } as any;
  return { caller: paymentRouter.createCaller(ctx), created, updated, deleted, missionUpdates };
}

describe('payment.createManual', () => {
  it('records a manual payment without touching Stripe', async () => {
    const { caller, created } = setup();

    await caller.createManual({
      clientId: 'c-1',
      amount: 250,
      description: 'Old invoice',
      dueDate: '2024-01-31',
    });

    expect(created[0]).toMatchObject({
      collectionMethod: 'MANUAL',
      status: 'PENDING',
      amount: 250,
      totalWithFees: 250,
      stripeFee: 0,
    });
  });

  it('marks it paid on the given date', async () => {
    const { caller, updated } = setup();

    await caller.createManual({
      clientId: 'c-1',
      amount: 250,
      description: 'Old invoice',
      dueDate: '2024-01-31',
      paid: true,
      paidAt: '2024-02-05',
    });

    expect(updated[0]).toMatchObject({ status: 'PAID', paidAt: new Date('2024-02-05') });
  });
});

describe('payment.setStatus', () => {
  it('marks a manual payment unpaid and reopens a paid mission', async () => {
    const { caller, updated, missionUpdates } = setup({ status: 'PAID' });

    await caller.setStatus({ id: 'pay-1', status: 'PENDING' });

    expect(updated[0]).toEqual({ status: 'PENDING', paidAt: null });
    expect(missionUpdates[0].data.status).toBe('INVOICED');
  });

  it('reopens a paid payment as past due when its due day is over', async () => {
    const { caller, updated } = setup({ status: 'PAID', dueDate: new Date('2020-01-01') });

    await caller.setStatus({ id: 'pay-1', status: 'PENDING' });

    expect(updated[0].status).toBe('PAST_DUE');
  });

  it('refuses to reopen a payment that is not paid', async () => {
    const { caller } = setup({ status: 'EXPIRED' });

    await expect(caller.setStatus({ id: 'pay-1', status: 'PENDING' })).rejects.toThrow('reopened');
  });

  it('refuses a Stripe payment', async () => {
    const { caller } = setup({ collectionMethod: 'STRIPE' });

    await expect(caller.setStatus({ id: 'pay-1', status: 'PAID' })).rejects.toThrow('manual');
  });
});

describe('payment.update and payment.delete', () => {
  it('edits a paid manual payment and keeps the totals in step', async () => {
    const { caller, updated } = setup({ status: 'PAID' });

    await caller.update({ id: 'pay-1', amount: 300, paidAt: '2024-05-01' });

    expect(updated[0]).toMatchObject({ amount: 300, totalWithFees: 300, stripeFee: 0 });
  });

  it('refuses a new amount on a settled Stripe payment', async () => {
    const { caller } = setup({ collectionMethod: 'STRIPE', status: 'PENDING' });
    const paid = setup({ collectionMethod: 'STRIPE', status: 'PAID' });

    await expect(paid.caller.update({ id: 'pay-1', amount: 5 })).rejects.toThrow('already paid');
    await caller.update({ id: 'pay-1', amount: 5 });
  });

  it('deletes a manual payment', async () => {
    const { caller, deleted } = setup();

    await caller.delete({ id: 'pay-1' });

    expect(deleted).toEqual(['pay-1']);
  });

  it('refuses to delete a Stripe payment', async () => {
    const { caller, deleted } = setup({ collectionMethod: 'STRIPE' });

    await expect(caller.delete({ id: 'pay-1' })).rejects.toThrow('Cancel it instead');
    expect(deleted.length).toBe(0);
  });
});
