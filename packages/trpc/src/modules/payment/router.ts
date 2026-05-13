import { router, publicProcedure, protectedProcedure, adminProcedure } from '../../trpc';
import { paymentService } from './service';
import {
  CreatePaymentSchema,
  UpdatePaymentSchema,
  ListPaymentsSchema,
  GetPaymentByIdSchema,
  CancelPaymentSchema,
  WebhookSchema,
} from './types';
import { TRPCError } from '@trpc/server';

export const paymentRouter = router({
  list: adminProcedure.input(ListPaymentsSchema).query(async ({ ctx, input }) => {
    return paymentService.listPayments(ctx.db, input);
  }),

  getById: adminProcedure
    .input(GetPaymentByIdSchema)
    .query(async ({ ctx, input }) => {
      return paymentService.getPaymentById(ctx.db, input.id);
    }),

  create: adminProcedure
    .input(CreatePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const stripe = input.collectionMethod === 'STRIPE' ? await ctx.getStripe() : null;
      const smtp = input.collectionMethod === 'STRIPE' ? await ctx.getSmtp() : null;

      return paymentService.createPayment(
        ctx.db,
        stripe,
        smtp,
        ctx.env,
        ctx.appOrigin,
        input
      );
    }),

  update: adminProcedure
    .input(UpdatePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return paymentService.updatePayment(ctx.db, id, data);
    }),

  cancel: adminProcedure
    .input(CancelPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      return paymentService.cancelPayment(ctx.db, await ctx.getStripe(), input.id);
    }),

  sendReminder: adminProcedure
    .input(GetPaymentByIdSchema)
    .mutation(async ({ ctx, input }) => {
      const smtp = await ctx.getSmtp();
      await paymentService.sendReminder(ctx.db, smtp, ctx.env, ctx.appOrigin, input.id);
      return { success: true };
    }),

  markExpired: adminProcedure.mutation(async ({ ctx }) => {
    return paymentService.markExpiredPayments(ctx.db);
  }),

  myPayments: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view your payments',
      });
    }

    const client = await ctx.db.client.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!client) {
      return { payments: [], total: 0 };
    }

    const payments = await ctx.db.payment.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        attachedDocuments: {
          include: {
            document: true,
          },
        },
      },
    });

    return { payments, total: payments.length };
  }),

  getByIdPublic: publicProcedure
    .input(GetPaymentByIdSchema)
    .query(async ({ ctx, input }) => {
      return paymentService.getPaymentById(ctx.db, input.id);
    }),

  getClientSecret: publicProcedure
    .input(GetPaymentByIdSchema)
    .query(async ({ ctx, input }) => {
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
          { expand: ['latest_invoice.payment_intent'] }
        );
        const invoice = subscription.latest_invoice as any;
        clientSecret = invoice?.payment_intent?.client_secret;
      }

      if (!clientSecret) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Unable to retrieve payment client secret',
        });
      }

      return { clientSecret };
    }),

  handleWebhook: publicProcedure
    .input(WebhookSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const [stripe, smtp] = await Promise.all([ctx.getStripe(), ctx.getSmtp()]);
        const event = await stripe.constructEvent(input.body, input.signature);

        await paymentService.handleWebhook(
          ctx.db,
          ctx.storage,
          smtp,
          ctx.env,
          event
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});

export default paymentRouter;
