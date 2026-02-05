import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import { hasAccess } from '@repo/auth-shared';
import { UserRole } from '@repo/types';
import { type OpenApiMeta } from 'trpc-to-openapi';

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create({
  errorFormatter({ shape, error, ctx, path }) {
    if (ctx?.log && error.code === 'INTERNAL_SERVER_ERROR') {
      ctx.log.error({
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack,
          cause: error.cause,
        },
        path,
      });
    }

    const isProduction = process.env.NODE_ENV === 'production';

    return {
      ...shape,
      data: {
        ...shape.data,
        stack: isProduction ? undefined : shape.data.stack,
      },
    };
  },
});

export const router = t.router;

const loggingMiddleware = t.middleware(async ({ path, type, next, ctx }) => {
  const start = Date.now();

  const result = await next();

  const duration = Date.now() - start;

  ctx.log.debug({
    type: 'trpc-call',
    path,
    callType: type,
    duration: `${duration}ms`,
    success: result.ok,
  });

  return result;
});

export const publicProcedure = t.procedure.use(loggingMiddleware);

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please log in.' });
  }
  return next({
    ctx: { ...ctx, user: ctx.user },
  });
});

const isAdmin = t.middleware(({ next, ctx }) => {
  if (!hasAccess(ctx.user, UserRole.ADMIN)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access restricted to administrators.',
    });
  }
  return next();
});

export const protectedProcedure = t.procedure.use(loggingMiddleware).use(isAuthed);
export const adminProcedure = protectedProcedure.use(isAdmin);
