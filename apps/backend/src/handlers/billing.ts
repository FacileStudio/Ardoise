import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { PrismaClient } from '@repo/database';
import {
  BillingApiError,
  bearerVerifier,
  cachedCatalog,
  createCheckout,
  createPortal,
  parseRedirectOrigins,
  parseSpaceId,
  spaceStatus,
  type BillingDeps,
  type DirectorySource,
} from '@repo/trpc/billing';
import { createRouteRateLimit } from '../middleware/rate-limit.middleware';

/** Minimal logger shape, satisfied by pino. */
interface BillingRouteLogger {
  warn(object: unknown, message?: string): void;
  error(object: unknown, message?: string): void;
}

/** What the billing routes need from the server. */
export interface BillingRouteOptions {
  db: PrismaClient;
  env: { BILLING_API_TOKEN?: string; BILLING_REDIRECT_ORIGINS: string };
  directory: DirectorySource | null;
  getStripe: () => Promise<{ client: BillingDeps['stripe'] }>;
  logger: BillingRouteLogger;
  limits?: { catalog: number; billing: number };
}

const fail = (c: Context, status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500 | 503, code: string, message: string) =>
  c.json({ error: { code, message } }, status);

/**
 * GET /api/catalog (public, cached 60 s) and the server-to-server billing API
 * Registre calls: GET /billing/spaces/:spaceId, POST /billing/checkout and
 * POST /billing/portal. The billing routes never read an Ardoise session:
 * they need `Authorization: Bearer <BILLING_API_TOKEN>`, and they answer 404
 * when the token is missing or shorter than 32 characters.
 */
export function createBillingRoutes(options: BillingRouteOptions) {
  const { db, logger } = options;
  const verify = bearerVerifier(options.env.BILLING_API_TOKEN);
  const origins = parseRedirectOrigins(options.env.BILLING_REDIRECT_ORIGINS);
  const limits = options.limits ?? { catalog: 120, billing: 60 };
  if (!verify) logger.warn({}, '[BILLING] BILLING_API_TOKEN missing or shorter than 32 characters, billing routes disabled');

  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof BillingApiError) return fail(c, err.status, err.code, err.message);
    if (err.name === 'BodyLimitError') return fail(c, 413, 'too_large', 'Request body too large');
    logger.error({ error: err instanceof Error ? err.message : 'unknown' }, '[BILLING] Request failed');
    return fail(c, 500, 'internal', 'Internal server error');
  });

  app.use('/api/catalog', createRouteRateLimit('catalog', { windowMs: 60_000, maxRequests: limits.catalog }));
  app.get('/api/catalog', async (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(await cachedCatalog(db));
  });

  app.use('/billing/*', createRouteRateLimit('billing', { windowMs: 60_000, maxRequests: limits.billing }));
  app.use('/billing/*', async (c, next) => {
    if (!verify) return fail(c, 404, 'not_configured', 'Billing is not configured');
    if (!verify(c.req.header('authorization'))) return fail(c, 401, 'unauthorized', 'Invalid token');
    return next();
  });
  app.use(
    '/billing/*',
    bodyLimit({ maxSize: 16 * 1024, onError: (c) => fail(c, 413, 'too_large', 'Request body too large') })
  );

  const snapshot = async () => {
    if (!options.directory) throw new BillingApiError(503, 'directory_unavailable', 'Registre is not configured');
    try {
      return await options.directory.snapshot();
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : 'unknown' }, '[BILLING] Registre snapshot failed');
      throw new BillingApiError(503, 'directory_unavailable', 'Registre is unavailable');
    }
  };

  const stripe = async () => {
    try {
      return (await options.getStripe()).client;
    } catch {
      throw new BillingApiError(503, 'stripe_unavailable', 'Payments are not configured');
    }
  };

  const json = (c: Context) =>
    c.req.json().catch((error: unknown) => {
      if (error instanceof Error && error.name === 'BodyLimitError') throw error;
      throw new BillingApiError(400, 'invalid_body', 'Invalid request body');
    });

  app.get('/billing/spaces/:spaceId', async (c) => {
    const spaceId = parseSpaceId(c.req.param('spaceId'));
    return c.json(await spaceStatus(db, await snapshot(), spaceId));
  });

  app.post('/billing/checkout', async (c) => {
    const body = await json(c);
    const [directory, client] = await Promise.all([snapshot(), stripe()]);
    return c.json(await createCheckout({ db, stripe: client, directory, redirectOrigins: origins }, body));
  });

  app.post('/billing/portal', async (c) => {
    const body = await json(c);
    const [directory, client] = await Promise.all([snapshot(), stripe()]);
    return c.json(await createPortal({ db, stripe: client, directory, redirectOrigins: origins }, body));
  });

  return app;
}
