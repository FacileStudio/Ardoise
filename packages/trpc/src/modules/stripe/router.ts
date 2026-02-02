import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import { stripeService } from './service';

export const stripeRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({ priceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return stripeService.createCheckoutSession(
        ctx.db,
        ctx.stripe,
        ctx.user.id,
        input.priceId,
        ctx.env.FRONTEND_URL
      );
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    return stripeService.createPortalSession(ctx.db, ctx.stripe, ctx.user.id, ctx.env.FRONTEND_URL);
  }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return stripeService.getSubscription(ctx.db, ctx.user.id);
  }),

  syncSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    return stripeService.syncSubscription(ctx.db, ctx.stripe, ctx.user.id);
  }),
});

export default stripeRouter;
