import { z } from 'zod';
import { router, publicProcedure } from '../../trpc';
import { createPaymentCheckout } from './checkout';
import { DeclarePaymentSchema, declarePayment, expireCheckoutSession, notifyDeclared } from './declare';
import { resolvePaymentLink } from './link';
import { payerView } from './payer';

const TokenSchema = z.object({ token: z.string().min(1).max(128) });

const returnUrls = (frontendUrl: string, token: string) => {
  const base = `${frontendUrl.replace(/\/$/, '')}/pay/${token}`;
  return { success: `${base}?paid=1`, cancel: base };
};

/**
 * The public pay page. Every call is a POST so the token stays out of URL query
 * logs, and every failure is the same NOT_FOUND so a token cannot be probed.
 */
export const payLinkRouter = router({
  get: publicProcedure.input(TokenSchema).mutation(async ({ ctx, input }) => {
    const payment = await resolvePaymentLink(ctx.db, input.token);
    return payerView(ctx.db, payment);
  }),

  checkout: publicProcedure.input(TokenSchema).mutation(async ({ ctx, input }) => {
    const payment = await resolvePaymentLink(ctx.db, input.token);
    const stripe = await ctx.getStripe();
    return createPaymentCheckout(ctx.db, stripe, payment, returnUrls(ctx.env.FRONTEND_URL, input.token));
  }),

  declare: publicProcedure
    .input(TokenSchema.extend({ declaration: DeclarePaymentSchema }))
    .mutation(async ({ ctx, input }) => {
      const payment = await resolvePaymentLink(ctx.db, input.token);
      await declarePayment(ctx.db, payment, input.declaration, {
        userId: null,
        via: 'link',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      await expireCheckoutSession(ctx.getStripe, payment.stripeCheckoutSessionId);
      await notifyDeclared(ctx.db, ctx.getSmtp, payment.id, ctx.env.FRONTEND_URL);
      return { ok: true as const };
    }),
});

export default payLinkRouter;
