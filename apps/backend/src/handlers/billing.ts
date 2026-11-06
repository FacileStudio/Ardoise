import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
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
import { RateLimiter, createRouteRateLimit, getClientIp } from '../middleware/rate-limit.middleware';

/** Minimal logger shape, satisfied by pino. */
interface BillingRouteLogger {
  info(object: unknown, message?: string): void;
  warn(object: unknown, message?: string): void;
  error(object: unknown, message?: string): void;
}

/** Per-minute ceilings of the billing routes. */
export interface BillingLimits {
  catalog: number;
  token: number;
  space: number;
  failures: number;
}

const DEFAULT_LIMITS: BillingLimits = { catalog: 120, token: 600, space: 30, failures: 20 };

const minute = (maxRequests: number) => ({ windowMs: 60_000, maxRequests });

/** What the billing routes need from the server. */
export interface BillingRouteOptions {
  db: PrismaClient;
  env: { BILLING_API_TOKEN?: string; BILLING_REDIRECT_ORIGINS: string };
  directory: DirectorySource | null;
  getStripe: () => Promise<{ client: BillingDeps['stripe'] }>;
  logger: BillingRouteLogger;
  limits?: Partial<BillingLimits>;
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
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const limiter = new RateLimiter();
  if (!verify) logger.warn({}, '[BILLING] BILLING_API_TOKEN missing or shorter than 32 characters, billing routes disabled');

  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof BillingApiError) return fail(c, err.status, err.code, err.message);
    if (err.name === 'BodyLimitError') return fail(c, 413, 'too_large', 'Request body too large');
    logger.error({ error: err instanceof Error ? err.message : 'unknown' }, '[BILLING] Request failed');
    return fail(c, 500, 'internal', 'Internal server error');
  });

  app.use(
    '/api/catalog',
    cors({ origin: '*', allowMethods: ['GET'], maxAge: 600, credentials: false })
  );
  app.use('/api/catalog', createRouteRateLimit('catalog', minute(limits.catalog), limiter));
  app.get('/api/catalog', async (c) => {
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(await cachedCatalog(db));
  });

  app.use('/billing/*', async (c, next) => {
    if (!verify) return fail(c, 404, 'not_configured', 'Billing is not configured');
    if (!verify(c.req.header('authorization'))) {
      const failures = `${getClientIp(c)}:billing-auth-failures`;
      if (limiter.check(failures, minute(limits.failures), 0).remaining === 0) {
        return fail(c, 429, 'rate_limited', 'Too many requests');
      }
      limiter.check(failures, minute(limits.failures));
      return fail(c, 401, 'unauthorized', 'Invalid token');
    }
    if (!limiter.check('billing-token', minute(limits.token)).allowed) {
      return fail(c, 429, 'rate_limited', 'Too many requests');
    }
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

  const json = async (c: Context) => {
    const body: unknown = await c.req.json().catch((error: unknown) => {
      if (error instanceof Error && error.name === 'BodyLimitError') throw error;
      throw new BillingApiError(400, 'invalid_body', 'Invalid request body');
    });
    const spaceId = (body as { space_id?: unknown } | null)?.space_id;
    const key = `billing-space:${typeof spaceId === 'string' ? spaceId.slice(0, 200) : ''}`;
    if (!limiter.check(key, minute(limits.space)).allowed) {
      throw new BillingApiError(429, 'rate_limited', 'Too many requests for this space');
    }
    return body;
  };

  app.get('/billing/spaces/:spaceId', async (c) => {
    const spaceId = parseSpaceId(c.req.param('spaceId'));
    return c.json(await spaceStatus(db, await snapshot(), spaceId));
  });

  app.post('/billing/checkout', async (c) => {
    const body = await json(c);
    const [directory, client] = await Promise.all([snapshot(), stripe()]);
    return c.json(await createCheckout({ db, stripe: client, directory, redirectOrigins: origins, logger }, body));
  });

  app.post('/billing/portal', async (c) => {
    const body = await json(c);
    const [directory, client] = await Promise.all([snapshot(), stripe()]);
    return c.json(await createPortal({ db, stripe: client, directory, redirectOrigins: origins, logger }, body));
  });

  return app;
}
