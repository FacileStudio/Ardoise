import { afterEach, describe, expect, it } from 'bun:test';
import { Prisma } from '@repo/database';
import type { PrismaClient } from '@repo/database';
import type Stripe from 'stripe';
import { paymentService } from './service';

const event = { id: 'evt_1', type: 'payment_intent.succeeded' } as Stripe.Event;
const original = paymentService.processWebhookEvent;

function ledgerDb() {
  const seen = new Set<string>();
  return {
    seen,
    db: {
      webhookEvent: {
        create: async ({ data }: any) => {
          if (seen.has(data.id)) {
            throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
          }
          seen.add(data.id);
        },
        delete: async ({ where }: any) => {
          seen.delete(where.id);
        },
        deleteMany: async () => ({ count: 0 }),
      },
    } as unknown as PrismaClient,
  };
}

afterEach(() => {
  paymentService.processWebhookEvent = original;
});

describe('paymentService.handleWebhook idempotency', () => {
  it('skips an event that was already processed', async () => {
    const { db } = ledgerDb();
    let runs = 0;
    paymentService.processWebhookEvent = async () => {
      runs += 1;
    };

    await paymentService.handleWebhook(db, {} as any, {} as any, {} as any, event);
    await paymentService.handleWebhook(db, {} as any, {} as any, {} as any, event);

    expect(runs).toBe(1);
  });

  it('lets Stripe redeliver an event whose processing failed', async () => {
    const { db } = ledgerDb();
    let runs = 0;
    paymentService.processWebhookEvent = async () => {
      runs += 1;
      if (runs === 1) throw new Error('connection reset');
    };

    await expect(
      paymentService.handleWebhook(db, {} as any, {} as any, {} as any, event)
    ).rejects.toThrow('connection reset');
    await paymentService.handleWebhook(db, {} as any, {} as any, {} as any, event);

    expect(runs).toBe(2);
  });
});
