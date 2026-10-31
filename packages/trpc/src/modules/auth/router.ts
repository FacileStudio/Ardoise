import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { loginSchema } from '@repo/auth-shared';
import { REFRESH_COOKIE_NAME, extractCookie } from '../../context';
import { TRPCError } from '@trpc/server';
import authService from './service';
import { authCookies, clearedAuthCookies, cookieOptions } from './session';
import { z } from 'zod';

function appendCookies(resHeaders: Headers, cookies: string[]) {
  for (const cookie of cookies) resHeaders.append('Set-Cookie', cookie);
}

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const result = await authService.login(
      ctx.db,
      ctx.auth,
      input,
      { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
      { ssoOnly: ctx.env.SSO_ONLY }
    );
    appendCookies(
      ctx.resHeaders,
      authCookies(result.token, result.refreshToken, cookieOptions(ctx.env))
    );
    return { user: result.user };
  }),

  refresh: publicProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req?.headers.get('cookie') ?? null;
    const refreshToken = extractCookie(cookieHeader, REFRESH_COOKIE_NAME);
    if (!refreshToken) {
      appendCookies(ctx.resHeaders, clearedAuthCookies(cookieOptions(ctx.env)));
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No refresh token',
      });
    }

    const result = await authService.refresh(ctx.db, ctx.auth, refreshToken);
    appendCookies(
      ctx.resHeaders,
      authCookies(result.token, result.refreshToken, cookieOptions(ctx.env))
    );
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
    appendCookies(ctx.resHeaders, clearedAuthCookies(cookieOptions(ctx.env)));
    return { success: true };
  }),
});

export default authRouter;
