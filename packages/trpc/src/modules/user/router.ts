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
   * Only a client portal account erases itself here, through the same
   * anonymisation as a Registre erasure notice: the account becomes a
   * tombstone and every issued document and payment stays. A Facile SSO
   * account belongs to Registre, which erases it and notifies Ardoise.
   */
  deleteOwnAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Facile SSO accounts are deleted in Registre (sso.facile.studio)',
      });
    }
    return userService.deleteOwnAccount(
      {
        db: ctx.db,
        issuer: ctx.env.OIDC_ISSUER ?? '',
        removeFile: (key) => ctx.storage.delete(key),
      },
      ctx.user.id
    );
  }),
});

export default userRouter;
