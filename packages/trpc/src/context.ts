import { initTRPC, TRPCError } from '@trpc/server';
import { prisma } from '@repo/database';
import { auth } from './lib/auth';

export const createContext = async (opts: any) => {
  const headers = opts.req instanceof Request ? opts.req.headers : new Headers(opts.req?.headers);
  const authHeader = headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  let user = null;

  if (!token) return { user, db: prisma };
  const sessionRes = await auth.api.getSession({ headers });

  if (sessionRes?.user) return { user: sessionRes.user, db: prisma };
  const dbSession = await prisma.session.findFirst({
    where: { token: token },
    include: { user: true },
  });
  return { user: dbSession.user || null, db: prisma };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({
    ctx: { ...ctx, user: ctx.user },
  });
});

const isAdmin = t.middleware(({ next, ctx }) => {
  if (!ctx.user || ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Accès réservé aux administrateurs.',
    });
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
  });
});

export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin);
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
