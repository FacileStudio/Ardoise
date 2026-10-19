import { router, publicProcedure, adminProcedure } from '../../trpc';
import { authCookies, cookieOptions } from '../auth/session';
import invitationService from './service';
import {
  AcceptInvitationSchema,
  CreateInvitationSchema,
  InvitationIdSchema,
  InvitationTokenSchema,
} from './types';

export const invitationRouter = router({
  create: adminProcedure.input(CreateInvitationSchema).mutation(async ({ ctx, input }) => {
    const smtp = await ctx.getSmtp();
    return invitationService.create(ctx.db, smtp, ctx.appOrigin, ctx.user.id, input);
  }),

  list: adminProcedure.query(async ({ ctx }) => {
    return invitationService.listPending(ctx.db);
  }),

  revoke: adminProcedure.input(InvitationIdSchema).mutation(async ({ ctx, input }) => {
    return invitationService.revoke(ctx.db, input.id);
  }),

  resend: adminProcedure.input(InvitationIdSchema).mutation(async ({ ctx, input }) => {
    const smtp = await ctx.getSmtp();
    return invitationService.resend(ctx.db, smtp, ctx.appOrigin, ctx.user.id, input.id);
  }),

  preview: publicProcedure.input(InvitationTokenSchema).query(async ({ ctx, input }) => {
    return invitationService.preview(ctx.db, input.token);
  }),

  accept: publicProcedure.input(AcceptInvitationSchema).mutation(async ({ ctx, input }) => {
    const result = await invitationService.accept(ctx.db, ctx.auth, input, {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    for (const cookie of authCookies(result.token, result.refreshToken, cookieOptions(ctx.env))) {
      ctx.resHeaders.append('Set-Cookie', cookie);
    }
    return { user: result.user };
  }),
});

export default invitationRouter;
