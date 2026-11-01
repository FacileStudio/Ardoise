import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { authCookies, cookieOptions } from '../auth/session';
import magicLinkService from './service';

const RequestSchema = z.object({ email: z.string().trim().email() });
const ConsumeSchema = z.object({ token: z.string().min(1).max(256) });

export const magicLinkRouter = router({
  request: publicProcedure.input(RequestSchema).mutation(async ({ ctx, input }) => {
    return magicLinkService.request(ctx, input.email, ctx.ipAddress);
  }),

  consume: publicProcedure.input(ConsumeSchema).mutation(async ({ ctx, input }) => {
    const result = await magicLinkService.consume(ctx, ctx.auth, input.token, {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    for (const cookie of authCookies(result.token, result.refreshToken, cookieOptions(ctx.env))) {
      ctx.resHeaders.append('Set-Cookie', cookie);
    }
    return { user: result.user };
  }),
});

export default magicLinkRouter;
