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

      // Hono permet de récupérer le body brut facilement (indispensable pour Stripe)
      const rawBody = await c.req.text();

      await stripeService.handleWebhook(prisma, stripe, rawBody, signature);

      return c.json({ received: true });
    } catch (error: any) {
      logger.error({
        message: 'Webhook error',
        error: error.message,
        type: 'stripe-webhook',
      });

      return c.json({ error: 'Webhook processing failed' }, 500);
    }
  };
};
