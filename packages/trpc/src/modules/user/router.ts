import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import userService from './service';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return userService.getProfile(ctx.db, ctx.user.id);
  }),

  list: adminProcedure
    .input(
      z
        .object({
          status: z.enum(['all', 'active', 'suspended', 'banned', 'pending']).optional(),
          role: z.enum(['all', 'admin', 'user']).optional(),
          emailVerified: z.boolean().optional(),
          isPremium: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return userService.getAllUsers(ctx.db, input);
    }),

  getById: adminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return userService.getUserById(ctx.db, input.id);
  }),

  getStats: adminProcedure.query(async ({ ctx }) => {
    return userService.getUserStats(ctx.db);
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        isPremium: z.boolean().optional(),
        role: z.enum(['USER', 'ADMIN']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return userService.updateUser(ctx.db, id, data);
    }),

  ban: adminProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.banUser(ctx.db, input.id, input.reason, ctx.user.id);
    }),

  unban: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return userService.unbanUser(ctx.db, input.id);
  }),

  suspend: adminProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
        until: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.suspendUser(ctx.db, input.id, input.reason, input.until);
    }),

  unsuspend: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return userService.unsuspendUser(ctx.db, input.id);
  }),

  verifyEmail: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return userService.verifyEmail(ctx.db, input.id);
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return userService.deleteUser(ctx.db, input.id);
  }),

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return userService.bulkDeleteUsers(ctx.db, input.ids);
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.updateProfile(ctx.db, ctx.user.id, input);
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.changePassword(
        ctx.db,
        ctx.auth,
        ctx.user.id,
        input.currentPassword,
        input.newPassword
      );
    }),

  deleteOwnAccount: protectedProcedure.mutation(async ({ ctx }) => {
    return userService.deleteOwnAccount(ctx.db, ctx.user.id);
  }),
});

export default userRouter;
