import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { REFRESH_COOKIE_NAME, extractCookies } from '../../context';
import { TRPCError } from '@trpc/server';
import authService from './service';
import { authCookies, clearedAuthCookies, cookieOptions } from './session';
import { z } from 'zod';

function appendCookies(resHeaders: Headers, cookies: string[]) {
  for (const cookie of cookies) resHeaders.append('Set-Cookie', cookie);
}

export const authRouter = router({
  refresh: publicProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req?.headers.get('cookie') ?? null;
    const candidates = extractCookies(cookieHeader, REFRESH_COOKIE_NAME);
    if (candidates.length === 0) {
      appendCookies(ctx.resHeaders, clearedAuthCookies(cookieOptions(ctx.env)));
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No refresh token',
      });
    }

    let result: Awaited<ReturnType<typeof authService.refresh>> | null = null;
    let failure: unknown = null;
    for (const candidate of candidates) {
      try {
        result = await authService.refresh(ctx.db, ctx.auth, candidate);
        break;
      } catch (err) {
        if (!(err instanceof TRPCError) || err.code !== 'UNAUTHORIZED') throw err;
        failure = err;
      }
    }
    if (!result) throw failure;
    appendCookies(
      ctx.resHeaders,
      authCookies(result.token, result.refreshToken, cookieOptions(ctx.env))
    );
    return { user: result.user };
  }),

  me: protectedProcedure.input(z.object({})).query(({ ctx }) => {
    return authService.me(ctx.db, ctx.user.id);
  }),

  logout: protectedProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    const cookieHeader = ctx.req?.headers.get('cookie') ?? null;
    const tokens = extractCookies(cookieHeader, REFRESH_COOKIE_NAME);
    if (tokens.length > 0) {
      await ctx.db.session.deleteMany({ where: { token: { in: tokens } } });
    }
    appendCookies(ctx.resHeaders, clearedAuthCookies(cookieOptions(ctx.env)));
    return { success: true };
  }),
});

export default authRouter;
