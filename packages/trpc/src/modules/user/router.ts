import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import userService from './service';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return userService.getProfile(ctx.db, ctx.user.id);
  }),

  list: adminProcedure.query(async ({ ctx }) => {
    return userService.getAllUsers(ctx.db);
  }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        isPremium: z.boolean().optional(),
        role: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return userService.updateUser(ctx.db, id, data);
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return userService.deleteUser(ctx.db, input.id);
  }),
});

export default userRouter;
