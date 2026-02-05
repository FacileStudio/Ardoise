import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { loginSchema, registerSchema } from '@repo/auth-shared';
import authService from './service';
import { z } from 'zod';

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    return authService.login(ctx.db, ctx.auth, input);
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    return authService.register(ctx.db, ctx.auth, input);
  }),

  me: protectedProcedure.input(z.object({})).query(({ ctx }) => {
    return ctx.user;
  }),

  logout: protectedProcedure.input(z.object({})).mutation(async ({}) => {
    return { success: true };
  }),
});

export default authRouter;
