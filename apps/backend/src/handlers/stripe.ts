import { Context } from 'hono';
import { stripeService } from '@repo/trpc';
import { StripeService } from '@repo/stripe';
import { prisma } from '@repo/database';
import { logger } from '../lib/logger';

export const createStripeWebhookHandler = (stripe: StripeService) => {
  return async (c: Context) => {
    try {
      const signature = c.req.header('stripe-signature');

      if (!signature) {
        return c.json({ error: 'No signature found' }, 400);
      }

      const rawBody = await c.req.text();

      await stripeService.handleWebhook(prisma, stripe, rawBody, signature);

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
