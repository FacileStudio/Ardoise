import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { loginSchema, registerSchema } from '@repo/auth-shared';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME, extractCookie } from '../../context';
import { TRPCError } from '@trpc/server';
import authService from './service';
import { z } from 'zod';

function setAuthCookies(
  resHeaders: Headers,
  accessToken: string,
  refreshToken: string,
  env: { NODE_ENV?: string }
) {
  const isProduction = env.NODE_ENV === 'production';
  const accessCookie = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(accessToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${15 * 60}`,
    ...(isProduction ? ['Secure'] : []),
  ].join('; ');
  resHeaders.append('Set-Cookie', accessCookie);

  const refreshCookie = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    'Path=/trpc/auth.refresh',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
    ...(isProduction ? ['Secure'] : []),
  ].join('; ');
  resHeaders.append('Set-Cookie', refreshCookie);
}

function clearAuthCookies(resHeaders: Headers, env: { NODE_ENV?: string }) {
  const isProduction = env.NODE_ENV === 'production';
  const cookiePaths: Record<string, string> = {
    [AUTH_COOKIE_NAME]: '/',
    [REFRESH_COOKIE_NAME]: '/trpc/auth.refresh',
  };
  for (const name of [AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME]) {
    const cookie = [
      `${name}=`,
      `Path=${cookiePaths[name]}`,
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
      ...(isProduction ? ['Secure'] : []),
    ].join('; ');
    resHeaders.append('Set-Cookie', cookie);
  }
}

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const result = await authService.login(ctx.db, ctx.auth, input, {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    setAuthCookies(ctx.resHeaders, result.token, result.refreshToken, ctx.env);
    return { user: result.user };
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    const result = await authService.register(ctx.db, ctx.auth, input, {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    setAuthCookies(ctx.resHeaders, result.token, result.refreshToken, ctx.env);
    return { user: result.user };
  }),

  refresh: publicProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req?.headers.get('cookie') ?? null;
    const refreshToken = extractCookie(cookieHeader, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      clearAuthCookies(ctx.resHeaders, ctx.env);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No refresh token',
      });
    }

    const result = await authService.refresh(ctx.db, ctx.auth, refreshToken);
    setAuthCookies(ctx.resHeaders, result.token, result.refreshToken, ctx.env);
    return { user: result.user };
  }),

  me: protectedProcedure.input(z.object({})).query(({ ctx }) => {
    return ctx.user;
  }),

  logout: protectedProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req?.headers.get('cookie') ?? null;
    const refreshToken = extractCookie(cookieHeader, REFRESH_COOKIE_NAME);
    if (refreshToken) {
      await ctx.db.session.deleteMany({ where: { token: refreshToken } });
    }
    clearAuthCookies(ctx.resHeaders, ctx.env);
    return { success: true };
  }),
});

export default authRouter;
