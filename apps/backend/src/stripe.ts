import { Context } from 'hono';
import { stripeService, createContext } from '@repo/trpc';
import { logger } from './lib/logger';

export const stripeWebhookHandler = async (c: Context) => {
  try {
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'No signature found' }, 400);
    }

    const rawBody = await c.req.text();

    const ctx = createContext(logger);
    await stripeService.handleWebhook(ctx.db, rawBody, signature);

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
