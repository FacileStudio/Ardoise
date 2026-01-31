import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter, createContext, auth, type Context } from '@repo/trpc';
import { logger } from '@/lib/logger';
import { loggerMiddleware } from './middleware/logger.middleware';

const app = new Hono();

app.use('*', cors());
app.use('*', loggerMiddleware);

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

app.use('/trpc/*', async (c, next) => {
  const ctx: Context = createContext(logger);

  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session) {
    ctx.user = { id: session.user.id };
    logger.info({ type: 'auth', message: 'User authenticated', id: session.user.id });
  }

  return trpcServer({ router: appRouter, createContext: () => ctx })(c, next);
});

app.get('/', (c) => c.json({ message: 'tRPC Backend' }));

const port = process.env.PORT || 3001;
logger.info({ message: `tRPC Server running`, url: `http://localhost:${port}/trpc` });

export default { port, fetch: app.fetch };
