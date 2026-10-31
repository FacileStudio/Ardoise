import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import userService from './service';
import { REFRESH_COOKIE_NAME, extractCookie } from '../../context';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return userService.getProfile(ctx.db, ctx.user.id);
  }),

  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(['CLIENT', 'ADMIN']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return userService.createUser(ctx.db, ctx.auth, input);
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
        role: z.enum(['CLIENT', 'ADMIN']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return userService.updateUser(ctx.db, id, data);
    }),

  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        role: z.enum(['CLIENT', 'ADMIN']).optional(),
        password: z.string().min(8).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return userService.adminUpdateUser(ctx.db, ctx.auth, id, data);
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
        input.newPassword,
        extractCookie(ctx.req?.headers.get('cookie') ?? null, REFRESH_COOKIE_NAME)
      );
    }),

  deleteOwnAccount: protectedProcedure.mutation(async ({ ctx }) => {
    return userService.deleteOwnAccount(ctx.db, ctx.user.id);
  }),
});

export default userRouter;
