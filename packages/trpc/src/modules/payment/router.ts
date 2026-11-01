import { router, publicProcedure, protectedProcedure, adminProcedure } from '../../trpc';
import { paymentService } from './service';
import spaceService from '../space/service';
import {
  CreatePaymentSchema,
  UpdatePaymentSchema,
  CreateManualPaymentSchema,
  SetPaymentStatusSchema,
  ListPaymentsSchema,
  GetPaymentByIdSchema,
  CancelPaymentSchema,
  SpaceScopeSchema,
} from './types';
import { TRPCError } from '@trpc/server';
import type Stripe from 'stripe';

export const paymentRouter = router({
  list: adminProcedure.input(ListPaymentsSchema).query(async ({ ctx, input }) => {
    const { spaceId, ...params } = input;
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
    return paymentService.listPayments(ctx.db, params, scope);
  }),

  stats: adminProcedure.input(SpaceScopeSchema).query(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input?.spaceId);
    return paymentService.paymentStats(ctx.db, scope);
  }),

  getById: adminProcedure.input(GetPaymentByIdSchema).query(async ({ ctx, input }) => {
    return paymentService.getPaymentById(ctx.db, ctx.user.id, input.id);
  }),

  create: adminProcedure.input(CreatePaymentSchema).mutation(async ({ ctx, input }) => {
    const stripe = input.collectionMethod === 'STRIPE' ? await ctx.getStripe() : null;
    const smtp = input.collectionMethod === 'STRIPE' ? await ctx.getSmtp() : null;

    return paymentService.createPayment(
      ctx.db,
      ctx.user.id,
      stripe,
      smtp,
      ctx.env,
      ctx.appOrigin,
      input
    );
  }),

  createManual: adminProcedure.input(CreateManualPaymentSchema).mutation(async ({ ctx, input }) => {
    return paymentService.createManualPayment(ctx.db, ctx.user.id, input);
  }),

  setStatus: adminProcedure.input(SetPaymentStatusSchema).mutation(async ({ ctx, input }) => {
    return paymentService.setPaymentStatus(ctx.db, ctx.user.id, input);
  }),

  delete: adminProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    return paymentService.deletePayment(ctx.db, ctx.user.id, input.id);
  }),

  update: adminProcedure.input(UpdatePaymentSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    return paymentService.updatePayment(ctx.db, ctx.user.id, id, data);
  }),

  cancel: adminProcedure.input(CancelPaymentSchema).mutation(async ({ ctx, input }) => {
    return paymentService.cancelPayment(ctx.db, ctx.user.id, await ctx.getStripe(), input.id);
  }),

  sendReminder: adminProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    const smtp = await ctx.getSmtp();
    await paymentService.sendReminder(ctx.db, ctx.user.id, smtp, ctx.env, ctx.appOrigin, input.id);
    return { success: true };
  }),

  markExpired: adminProcedure.input(SpaceScopeSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input?.spaceId);
    return paymentService.markExpiredPayments(ctx.db, scope);
  }),

  retryReceipts: adminProcedure.input(SpaceScopeSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input?.spaceId);
    const smtp = await ctx.getSmtp();
    return paymentService.retryFailedReceipts(ctx.db, ctx.storage, smtp, ctx.env, scope);
  }),

  myPayments: protectedProcedure.query(async ({ ctx }) => {
    return paymentService.listClientPayments(ctx.db, ctx.user.id);
  }),

  billingPortal: protectedProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    return paymentService.createBillingPortalSession(
      ctx.db,
      await ctx.getStripe(),
      input.id,
      ctx.user.id,
      `${ctx.appOrigin}/app/payment/${input.id}`
    );
  }),

  getByIdPublic: publicProcedure.input(GetPaymentByIdSchema).query(async ({ ctx, input }) => {
    return paymentService.getPaymentByIdPublic(ctx.db, input.id);
  }),

  getClientSecret: publicProcedure.input(GetPaymentByIdSchema).query(async ({ ctx, input }) => {
    const payment = await ctx.db.payment.findUnique({
      where: { id: input.id },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Payment is not pending',
      });
    }

    if (payment.collectionMethod !== 'STRIPE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This payment is not payable online',
      });
    }

    let clientSecret: string | null = null;
    const stripe = await ctx.getStripe();

    if (payment.stripePaymentIntentId) {
      const paymentIntent = await stripe.client.paymentIntents.retrieve(
        payment.stripePaymentIntentId
      );
      clientSecret = paymentIntent.client_secret;
    } else if (payment.stripeSubscriptionId) {
      const subscription = await stripe.client.subscriptions.retrieve(
        payment.stripeSubscriptionId,
        { expand: ['latest_invoice'] }
      );
      const invoice = subscription.latest_invoice as Stripe.Invoice | null;
      clientSecret = invoice?.confirmation_secret?.client_secret ?? null;
    }

    if (!clientSecret) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to retrieve payment client secret',
      });
    }

    return { clientSecret };
  }),
});

export default paymentRouter;
