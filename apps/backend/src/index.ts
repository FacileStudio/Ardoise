import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter, createContext, auth } from '@repo/trpc';
import { loggerMiddleware } from './middleware/logger.middleware';
import { stripeWebhookHandler } from './stripe';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: [process.env.TRUSTED_ORIGINS || 'http://localhost:3000'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
  })
);

app.use('*', loggerMiddleware);

app.post('/webhook', stripeWebhookHandler);

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

app.all('/trpc/*', (c, next) => {
  return trpcServer({
    router: appRouter,
    createContext: async (opts) => {
      return await createContext({
        ...opts,
        req: c.req.raw,
      });
    },
  })(c, next);
});

app.get('/', (c) => c.json({ message: 'tRPC Backend' }));

const port = Number(process.env.PORT) || 3001;

export default { port, fetch: app.fetch };
