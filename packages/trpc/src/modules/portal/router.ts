import { router, clientProcedure } from '../../trpc';
import portalService from './service';
import { DeclarePaymentSchema, declarePayment, expireCheckoutSession, notifyDeclared } from '../payment/declare';
import {
  PortalPaymentIdSchema,
  listOwnPayments,
  openOwnMaintenancePortal,
  ownPayment,
  startOwnCheckout,
} from './pay';
import { PortalDocumentIdSchema, PortalDocumentsInputSchema } from './types';

export const portalRouter = router({
  overview: clientProcedure.query(({ ctx }) => portalService.overview(ctx.db, ctx.user.id)),

  documents: clientProcedure
    .input(PortalDocumentsInputSchema)
    .query(({ ctx, input }) => portalService.listDocuments(ctx.db, ctx.user.id, input)),

  documentDownload: clientProcedure
    .input(PortalDocumentIdSchema)
    .query(({ ctx, input }) =>
      portalService.documentDownload(
        ctx.db,
        ctx.user.id,
        input.id,
        ctx.apiOrigin,
        ctx.env.ENCRYPTION_SECRET
      )
    ),

  payments: clientProcedure.query(({ ctx }) => listOwnPayments(ctx.db, ctx.user.id)),

  checkout: clientProcedure
    .input(PortalPaymentIdSchema)
    .mutation(async ({ ctx, input }) =>
      startOwnCheckout(ctx.db, await ctx.getStripe(), ctx.user.id, input.paymentId, ctx.env.FRONTEND_URL)
    ),

  manageMaintenance: clientProcedure
    .input(PortalPaymentIdSchema)
    .mutation(async ({ ctx, input }) =>
      openOwnMaintenancePortal(
        ctx.db,
        await ctx.getStripe(),
        ctx.user.id,
        input.paymentId,
        ctx.env.FRONTEND_URL
      )
    ),

  declarePayment: clientProcedure
    .input(PortalPaymentIdSchema.extend({ declaration: DeclarePaymentSchema }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ownPayment(ctx.db, ctx.user.id, input.paymentId);
      await declarePayment(ctx.db, payment, input.declaration, {
        userId: ctx.user.id,
        via: 'portal',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      await expireCheckoutSession(ctx.getStripe, payment.stripeCheckoutSessionId);
      await notifyDeclared(ctx.db, ctx.getSmtp, payment.id, ctx.env.FRONTEND_URL);
      return { ok: true as const };
    }),

  signLink: clientProcedure
    .input(PortalDocumentIdSchema)
    .mutation(({ ctx, input }) =>
      portalService.signLink(ctx.db, ctx.user.id, ctx.user.email, input.id, ctx.env)
    ),
});

export default portalRouter;
