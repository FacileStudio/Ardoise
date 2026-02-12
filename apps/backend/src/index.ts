import { Hono } from 'hono';
import { loggerMiddleware } from './middleware/logger.middleware';
import env from './lib/env';
import { AuthManager } from '@repo/auth';
import { StorageService } from '@repo/storage';
import { StripeService } from '@repo/stripe';
import { SMTPClient } from '@repo/smtp';
import { DocuSealService } from '@repo/trpc';
import corsHandler from './handlers/cors';
import { createStripeWebhookHandler } from './handlers/stripe';
import trpcHandler from './handlers/trpc';
import { openApiHandler } from './handlers/openapi';
import {
  createHealthCheckHandler,
  createLivenessHandler,
  createReadinessHandler,
} from './handlers/health';
import { bootstrapAdmin } from './lib/bootstrap';
import { logger } from './lib/logger';

// Version: 1.2.0 - Simplified document schema (fetch client/provider from IDs only)
const app = new Hono();

app.onError((err, c) => {
  logger.error('Unhandled error:', err);
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
  endpoint: env.MINIO_ENDPOINT,
  accessKeyId: env.MINIO_ROOT_USER,
  secretAccessKey: env.MINIO_ROOT_PASSWORD,
  bucket: env.MINIO_BUCKET_NAME,
});

const stripe = new StripeService({
  apiKey: env.STRIPE_SECRET_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
});

const smtp = new SMTPClient({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
  from: env.SMTP_FROM,
});

const docuseal = new DocuSealService(env.DOCUSEAL_API_URL, env.DOCUSEAL_API_KEY);

app.use('*', corsHandler(env.TRUSTED_ORIGINS));
app.use('*', loggerMiddleware);

app.post('/webhook', createStripeWebhookHandler(stripe, storage, smtp, env));

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
    smtp,
    docuseal,
    env,
  })
);

app.get('/', (c) => c.json({ message: 'Charles API', version: '1.0.3' }));

const port = Number(env.PORT);

export default { port, fetch: app.fetch };
