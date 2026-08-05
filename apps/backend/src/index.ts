import { Hono } from 'hono';
import { loggerMiddleware } from './middleware/logger.middleware';
import { authRateLimit, paymentRateLimit, generalRateLimit } from './middleware/rate-limit.middleware';
import env from './lib/env';
import { AuthManager } from '@repo/auth';
import { StorageService } from '@repo/storage';
import corsHandler from './handlers/cors';
import { createStripeWebhookHandler } from './handlers/stripe';
import trpcHandler from './handlers/trpc';
import { openApiHandler } from './handlers/openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { createStorageDownloadHandler, createStorageUploadHandler } from './handlers/storage';
import { createOIDCRoutes } from './handlers/oidc';
import {
  createHealthCheckHandler,
  createLivenessHandler,
  createReadinessHandler,
} from './handlers/health';
import { bootstrapAdmin } from './lib/bootstrap';
import { logger } from './lib/logger';

const VERSION = '1.2.1';
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

await bootstrapAdmin(env, authManager);

const storage = new StorageService({
  storagePath: env.STORAGE_PATH,
  publicUrl: env.BACKEND_URL,
});

const cors = corsHandler([env.FRONTEND_URL, env.BACKEND_URL]);

app.use('*', cors);
app.use('*', loggerMiddleware);

app.use('/trpc/auth.*', authRateLimit);
app.use('/trpc/payment.*', paymentRateLimit);
app.use('/trpc/*', async (c, next) => {
  const path = c.req.path;
  if (path.startsWith('/trpc/auth.') || path.startsWith('/trpc/payment.')) {
    return next();
  }
  return generalRateLimit(c, next);
});

app.options('/trpc/*', (c) => c.body(null, 204));
app.options('/storage/*', (c) => c.body(null, 204));
app.options('/webhook', (c) => c.body(null, 204));
app.options('*', (c) => c.body(null, 204));

app.post('/webhook', createStripeWebhookHandler(storage, env));

app.get('/docs/openapi.json', openApiHandler);
app.get('/docs', apiReference({ url: '/docs/openapi.json', pageTitle: 'Ardoise API' }));

app.get('/version', (c) => c.json({ version: VERSION }));
app.get('/health', createHealthCheckHandler({ storage }));
app.get('/health/live', createLivenessHandler());
app.get('/health/ready', createReadinessHandler());

app.put('/storage/*', createStorageUploadHandler({ authManager, storage, env }));
app.get('/storage/*', createStorageDownloadHandler({ authManager, storage, env }));

createOIDCRoutes(app, { authManager, env, storage });

app.all(
  '/trpc/*',
  trpcHandler({
    authManager,
    storage,
    env,
  })
);

app.get('/', (c) => c.json({ message: 'Ardoise API', version: '1.0.3' }));

const port = Number(env.PORT);

export default { port, fetch: app.fetch };
