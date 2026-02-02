import { trpcServer } from '@hono/trpc-server';
import { appRouter, createContext, CreateContextOptions } from '@repo/trpc';
import { Context, Next } from 'hono';

export const trpcHandler =
  ({
    authManager,
    storage,
    stripe,
    env,
  }: Omit<CreateContextOptions, 'req' | 'resHeaders' | 'info'>) =>
  (c: Context, next: Next) =>
    trpcServer({
      router: appRouter,
      createContext: async (opts) => {
        return await createContext({
          ...opts,
          req: c.req.raw,
          authManager,
          storage,
          stripe,
          env,
        });
      },
    })(c, next);

export default trpcHandler;
