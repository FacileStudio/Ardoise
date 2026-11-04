import { Context } from 'hono';
import { StorageService } from '@repo/storage';
import { paymentService } from '@repo/trpc';
import { handleBillingEvent, isBillingEvent } from '@repo/trpc/billing';
import { prisma } from '@repo/database';
import { logger } from '../lib/logger';
import type { ServerEnv } from '@repo/env';
import { getSmtpClient, getStripeService } from '@repo/trpc/settings';
import { Prisma } from '@repo/database';

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

/** What the webhook handler talks to, replaced in tests. */
export interface StripeWebhookDeps {
  db: typeof prisma;
  getStripe: typeof getStripeService;
  getSmtp: typeof getSmtpClient;
  handlePayment: typeof paymentService.handleWebhook;
  handleBilling: typeof handleBillingEvent;
}

const defaultDeps: StripeWebhookDeps = {
  db: prisma,
  getStripe: getStripeService,
  getSmtp: getSmtpClient,
  handlePayment: (...args) => paymentService.handleWebhook(...args),
  handleBilling: handleBillingEvent,
};

/**
 * POST /webhook: verifies the Stripe signature on the raw body, then sends
 * subscription events tagged with registre_space_id to the billing module
 * and everything else to the client-invoice payment flow.
 */
export const createStripeWebhookHandler = (
  storage: StorageService,
  env: ServerEnv,
  deps: StripeWebhookDeps = defaultDeps
) => {
  return async (c: Context) => {
    try {
      const signature = c.req.header('stripe-signature');

      if (!signature) {
        return c.json({ error: 'No signature found' }, 400);
      }

      const rawBody = await c.req.text();

      const stripe = await deps.getStripe(deps.db);
      const event = await stripe.constructEvent(rawBody, signature);

      if (isBillingEvent(event)) {
        await deps.handleBilling(deps.db, stripe.client, event, logger);
      } else {
        await deps.handlePayment(deps.db, storage, await deps.getSmtp(deps.db), env, event);
      }

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
