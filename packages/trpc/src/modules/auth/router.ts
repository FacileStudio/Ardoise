import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { loginSchema, registerSchema } from '@repo/auth-shared';
import authService from './service';

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    return authService.login(ctx.db, ctx.auth, input);
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    return authService.register(ctx.db, ctx.auth, input);
  }),

  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // await ctx.db.session.deleteMany({ where: { userId: ctx.user.id } });
    return { success: true };
  }),
});

export default authRouter;
