import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import userService from './service';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return userService.getProfile(ctx.db, ctx.user.id);
  }),

  /**
   * Clients edit their own name. Staff names come from Facile SSO and are
   * rewritten on every sign-in, so staff edits are refused.
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Staff profiles come from Facile SSO (sso.facile.studio)',
        });
      }
      return userService.updateProfile(ctx.db, ctx.user.id, input);
    }),

  /**
   * Only a client portal account deletes itself here. A Facile SSO account
   * belongs to Registre, and deleting its row would cascade to every document
   * it created in shared spaces.
   */
  deleteOwnAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Facile SSO accounts are deleted in Registre (sso.facile.studio)',
      });
    }
    return userService.deleteOwnAccount(ctx.db, ctx.user.id);
  }),
});

export default userRouter;
