import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter, createContext, verifyToken } from '@repo/trpc';
import { logger } from '@/lib/logger';
import { loggerMiddleware } from './middleware/logger.middleware';

const app = new Hono();

app.use('*', cors());
app.use('*', loggerMiddleware);

app.use('/trpc/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const ctx = createContext(logger);

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);

    if (payload) {
      ctx.user = { id: payload.userId };
      logger.info({ type: 'auth', message: 'User authenticated', userId: payload.userId });
    } else {
      logger.warn({ type: 'auth', message: 'Invalid token' });
    }
  }

  return trpcServer({ router: appRouter, createContext: () => ctx })(c, next);
});

app.get('/', (c) => c.json({ message: 'tRPC Backend' }));

const port = process.env.PORT || 3001;
logger.info({ message: `tRPC Server running`, url: `http://localhost:${port}/trpc` });

export default { port, fetch: app.fetch };
