import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import { hasAccess } from '@repo/auth-shared';
import { UserRole } from '@repo/types';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Veuillez vous connecter.' });
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
  });
});

const isAdmin = t.middleware(({ next, ctx }) => {
  if (!hasAccess(ctx.user, UserRole.ADMIN)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Accès réservé aux administrateurs.',
    });
  }
  return next();
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = protectedProcedure.use(isAdmin);
