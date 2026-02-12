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
          role: z.enum(['all', 'admin', 'user']).optional(),
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
        role: z.enum(['USER', 'ADMIN']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return userService.updateUser(ctx.db, id, data);
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
