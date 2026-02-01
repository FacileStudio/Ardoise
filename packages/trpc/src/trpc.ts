import { initTRPC, TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { auth } from './lib/auth';

export const createContext = async (opts: any) => {
  const session = await auth.api.getSession({
    headers: opts.req?.headers || opts.resHeaders,
  });

  if (!session) return { user: null, db: prisma };

  return {
    user: session.user,
    db: prisma,
  };
};
export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
