import type { PrismaClient } from '@repo/database';
import {
  EntitlementPusher,
  reconcileSubscriptions,
  registerEntitlementPusher,
  seedBilling,
  type EntitlementsRemote,
} from '@repo/trpc/billing';
import { getStripeService } from '@repo/trpc/settings';

/** How often entitlements are recomputed and pushed without a trigger. */
export const PUSH_INTERVAL_MS = 10 * 60 * 1000;

/** How often Stripe subscriptions are reconciled with SpaceSubscription rows. */
export const RECONCILE_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface BootLogger {
  info(object: unknown, message?: string): void;
  warn(object: unknown, message?: string): void;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Reconciles Stripe subscriptions once; a missing Stripe configuration is skipped quietly. */
export async function reconcileOnce(db: PrismaClient, logger: BootLogger): Promise<void> {
  let stripe;
  try {
    stripe = (await getStripeService(db)).client;
  } catch {
    return;
  }
  try {
    const result = await reconcileSubscriptions(db, stripe, logger);
    logger.info(result, '[BILLING] Stripe subscriptions reconciled');
  } catch (error) {
    logger.warn({ error: message(error) }, '[BILLING] Stripe reconcile failed');
  }
}

/**
 * Starts the billing background work: the optional seed, the entitlement
 * pusher (at boot and every ten minutes, only when Registre is configured)
 * and the nightly Stripe reconcile. Nothing here can crash the server.
 */
export function startBilling(options: {
  db: PrismaClient;
  registre: EntitlementsRemote | null;
  seedOnBoot: boolean;
  logger: BootLogger;
}): void {
  const { db, logger } = options;
  const pusher = options.registre ? new EntitlementPusher(db, options.registre, logger) : null;
  registerEntitlementPusher(pusher);
  if (!pusher) logger.info({}, '[BILLING] Registre not configured, entitlement push disabled');

  void (async () => {
    if (options.seedOnBoot) {
      try {
        logger.info(await seedBilling(db), '[BILLING] Seed applied');
      } catch (error) {
        logger.warn({ error: message(error) }, '[BILLING] Seed failed');
      }
    }
    await pusher?.start(PUSH_INTERVAL_MS);
  })();

  setTimeout(() => void reconcileOnce(db, logger), 60_000).unref();
  setInterval(() => void reconcileOnce(db, logger), RECONCILE_INTERVAL_MS).unref();
}
