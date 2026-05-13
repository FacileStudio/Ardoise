import { Context } from 'hono';
import { StorageService } from '@repo/storage';
import { paymentService } from '@repo/trpc';
import { prisma } from '@repo/database';
import { logger } from '../lib/logger';
import type { ServerEnv } from '@repo/env';
import { getSmtpClient, getStripeService } from '@repo/trpc/settings';
import { Prisma } from '@prisma/client';

const isTransientError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('connection') ||
      msg.includes('timeout');
  }

  return false;
};

export const createStripeWebhookHandler = (
  storage: StorageService,
  env: ServerEnv
) => {
  return async (c: Context) => {
    try {
      const signature = c.req.header('stripe-signature');

      if (!signature) {
        return c.json({ error: 'No signature found' }, 400);
      }

      const rawBody = await c.req.text();

      const [stripe, smtp] = await Promise.all([
        getStripeService(prisma),
        getSmtpClient(prisma),
      ]);
      const event = await stripe.constructEvent(rawBody, signature);

      await paymentService.handleWebhook(prisma, storage, smtp, env, event);

      return c.json({ received: true });
    } catch (error: unknown) {
      logger.error({
        message: 'Webhook error',
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'stripe-webhook',
      });

      if (isTransientError(error)) {
        return c.json({ error: 'Webhook processing failed' }, 500);
      }

      return c.json({ error: 'Webhook processing failed', permanent: true }, 200);
    }
  };
};
