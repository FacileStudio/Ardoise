import { Context } from 'hono';
import { StorageService } from '@repo/storage';
import { paymentService } from '@repo/trpc';
import { prisma } from '@repo/database';
import { logger } from '../lib/logger';
import type { ServerEnv } from '@repo/env';
import { getSmtpClient, getStripeService } from '@repo/trpc/settings';

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

      return c.json({ error: 'Webhook processing failed' }, 500);
    }
  };
};
