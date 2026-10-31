import { trpcServer } from '@hono/trpc-server';
import { appRouter, createContext, CreateContextOptions } from '@repo/trpc';
import { Context, Next } from 'hono';

const trpcHandler =
  ({
    authManager,
    storage,
    env,
  }: Omit<CreateContextOptions, 'req' | 'resHeaders' | 'info' | 'logger'>) =>
  (c: Context, next: Next) => {
    // @hono/trpc-server overwrites ctx.env with c.env, which is empty under Bun
    c.env = env;

    return trpcServer({
      router: appRouter,
      createContext: async (opts) => {
        const logger = c.get('logger');
        return await createContext({
          ...opts,
          req: c.req.raw,
          authManager,
          storage,
          env,
          logger,
        });
      },
    })(c, next);
  };

export default trpcHandler;
