import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { loginSchema, registerSchema } from '@repo/validators';
import { authService } from './service';

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    return authService.login(ctx.db, input);
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ input, ctx }) => {
    return authService.register(ctx.db, input);
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return authService.getProfile(ctx.db, ctx.user.id);
  }),
});
