import { Hono } from 'hono';
import { loggerMiddleware } from './middleware/logger.middleware';
import env from './lib/env';
import { AuthManager } from '@repo/auth';
import { StorageService } from '@repo/storage';
import { StripeService } from '@repo/stripe';
import corsHandler from './handlers/cors';
import { createStripeWebhookHandler } from './handlers/stripe';
import trpcHandler from './handlers/trpc';
import { openApiHandler } from './handlers/openapi';
import {
  createHealthCheckHandler,
  createLivenessHandler,
  createReadinessHandler,
} from './handlers/health';

const app = new Hono();

const authManager = new AuthManager({
  encryptionSecret: env.ENCRYPTION_SECRET,
});

const storage = new StorageService({
  endpoint: env.MINIO_ENDPOINT,
  accessKeyId: env.MINIO_ROOT_USER,
  secretAccessKey: env.MINIO_ROOT_PASSWORD,
  bucket: env.MINIO_BUCKET_NAME,
});

const stripe = new StripeService({
  apiKey: env.STRIPE_SECRET_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
});

app.use('*', corsHandler(env.TRUSTED_ORIGINS));
app.use('*', loggerMiddleware);

app.post('/webhook', createStripeWebhookHandler(stripe));

app.get('/openapi.json', openApiHandler);

app.get('/health', createHealthCheckHandler({ storage, stripe }));
app.get('/health/live', createLivenessHandler());
app.get('/health/ready', createReadinessHandler());

app.all(
  '/trpc/*',
  trpcHandler({
    authManager,
    storage,
    stripe,
    env,
  })
);

app.get('/', (c) => c.json({ message: 'Maxi Boilerplate API' }));

const port = Number(env.PORT);

export default { port, fetch: app.fetch };
