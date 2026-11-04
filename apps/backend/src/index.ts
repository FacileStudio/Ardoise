import { Hono } from 'hono';
import { loggerMiddleware } from './middleware/logger.middleware';
import { trpcRateLimit } from './middleware/rate-limit.middleware';
import env from './lib/env';
import { AuthManager } from '@repo/auth';
import { StorageService } from '@repo/storage';
import corsHandler from './handlers/cors';
import { createStripeWebhookHandler } from './handlers/stripe';
import { createPlumeWebhookHandler } from './handlers/plume';
import { GLOUTON_ROUTES_PREFIX, createGloutonRoutes } from './handlers/glouton';
import trpcHandler from './handlers/trpc';
import { openApiHandler } from './handlers/openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { createStorageDownloadHandler, createStorageUploadHandler } from './handlers/storage';
import { createOIDCRoutes } from './oidc/routes';
import {
  createHealthCheckHandler,
  createLivenessHandler,
  createReadinessHandler,
} from './handlers/health';
import { createVersionHandler, resolveVersion } from './handlers/version';
import { logger } from './lib/logger';
import { prisma } from '@repo/database';
import { DirectoryClient, SyncPath } from './registre/directory';
import { applySnapshot, buildImport } from './registre/spaces';
import { startDirectorySync } from './registre/boot';
import { createBillingRoutes } from './handlers/billing';
import { startBilling } from './billing';
import { getStripeService } from '@repo/trpc/settings';
import { requestEntitlementPush } from '@repo/trpc/billing';

const app = new Hono();

app.onError((err, c) => {
  logger.error({ err }, 'Unhandled error');
  return c.json(
    {
      error: 'Internal server error',
      message: env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
});

const authManager = new AuthManager({
  encryptionSecret: env.ENCRYPTION_SECRET,
});

const storage = new StorageService({
  storagePath: env.STORAGE_PATH,
  publicUrl: env.BACKEND_URL,
});

const issuer = env.OIDC_ISSUER && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET ? env.OIDC_ISSUER : null;
const registre = issuer ? new DirectoryClient(issuer, env.OIDC_CLIENT_ID!, env.OIDC_CLIENT_SECRET!) : null;
const directory =
  issuer && registre
    ? startDirectorySync({
        remote: registre,
        collect: () => buildImport(prisma, issuer),
        apply: async (snapshot) => {
          await applySnapshot({ db: prisma, issuer, logger }, snapshot);
          requestEntitlementPush();
        },
        logger,
      }).syncer
    : null;

startBilling({ db: prisma, registre, seedOnBoot: env.BILLING_SEED_ON_BOOT, logger });

const cors = corsHandler([env.FRONTEND_URL, env.BACKEND_URL]);

app.use('*', cors);
app.use('*', loggerMiddleware);

app.use('/trpc/*', trpcRateLimit);

app.options('/trpc/*', (c) => c.body(null, 204));
app.options('/storage/*', (c) => c.body(null, 204));
app.options('/webhook', (c) => c.body(null, 204));
app.options('*', (c) => c.body(null, 204));

app.post('/webhook', createStripeWebhookHandler(storage, env));
app.post('/webhooks/plume', createPlumeWebhookHandler(env));
app.route(GLOUTON_ROUTES_PREFIX, createGloutonRoutes(env, prisma));
app.route(
  '/',
  createBillingRoutes({
    db: prisma,
    env,
    directory: registre,
    getStripe: () => getStripeService(prisma),
    logger,
  })
);

if (directory) {
  app.post(SyncPath, (c) => {
    directory.nudge();
    return c.body(null, 202);
  });
}

app.get('/docs/openapi.json', openApiHandler);
app.get('/docs', apiReference({ url: '/docs/openapi.json', pageTitle: 'Ardoise API' }));

app.get('/version', createVersionHandler());
app.get('/health', createHealthCheckHandler({ storage }));
app.get('/health/live', createLivenessHandler());
app.get('/health/ready', createReadinessHandler());

app.put('/storage/*', createStorageUploadHandler({ authManager, storage, env }));
app.get('/storage/*', createStorageDownloadHandler({ authManager, storage, env }));

createOIDCRoutes(app, { authManager, env });

app.all(
  '/trpc/*',
  trpcHandler({
    authManager,
    storage,
    env,
  })
);

app.get('/', (c) => c.json({ message: 'Ardoise API', version: resolveVersion() }));

const port = Number(env.PORT);

export default { port, fetch: app.fetch };
