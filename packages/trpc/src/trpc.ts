import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import { hasAccess } from '@repo/auth-shared';
import { UserRole } from '@repo/types';
import { type OpenApiMeta } from 'trpc-to-openapi';
import { isPlatformStaff } from './platform-staff';

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

    if (isProduction && error.code === 'INTERNAL_SERVER_ERROR') {
      return {
        ...shape,
        message: 'An internal error occurred. Please try again later.',
        data: {
          ...shape.data,
          stack: undefined,
        },
      };
    }

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

const isMember = t.middleware(({ next, ctx }) => {
  if (!hasAccess(ctx.user, UserRole.MEMBER)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access restricted to space members.' });
  }
  return next();
});

const isClient = t.middleware(({ next, ctx }) => {
  if (ctx.user?.role !== UserRole.CLIENT) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access restricted to client accounts.' });
  }
  return next();
});

const isStaff = t.middleware(async ({ next, ctx }) => {
  if (!ctx.user || !(await isPlatformStaff(ctx.db, ctx.user.id, ctx.env))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé à l’équipe Facile Studio.' });
  }
  return next();
});

/** Anyone signed in, for their own account only. */
export const protectedProcedure = t.procedure.use(loggingMiddleware).use(isAuthed);

/** A client portal account; every query keys on the caller's own Client row. */
export const clientProcedure = protectedProcedure.use(isClient);

/**
 * A Facile SSO user working in spaces. The role only says "not a client":
 * every query must still take its space from the caller's memberships
 * (spaceService.resolveScope, requireRowScope).
 */
export const memberProcedure = protectedProcedure.use(isMember);

/**
 * Platform operators only (PLATFORM_STAFF_SUBS, read back from the database
 * on every call). The one gate for platform settings, the admin engine,
 * audit logs and the billing backoffice. Default deny: an unset list means
 * nobody.
 */
export const platformStaffProcedure = memberProcedure.use(isStaff);
