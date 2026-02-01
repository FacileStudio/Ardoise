import { z } from 'zod';
import { router, protectedProcedure } from '../../context';
import { stripeService } from './service';

export const stripeRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({ priceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error('User not authenticated');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return stripeService.createCheckoutSession(ctx.db, ctx.user.id, input.priceId, frontendUrl);
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error('User not authenticated');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return stripeService.createPortalSession(ctx.db, ctx.user.id, frontendUrl);
  }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error('User not authenticated');
    return stripeService.getSubscription(ctx.db, ctx.user.id);
  }),

  syncSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error('User not authenticated');
    return stripeService.syncSubscription(ctx.db, ctx.user.id);
  }),
});

export default stripeRouter;
