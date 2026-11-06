import { router, clientProcedure, memberProcedure } from '../../trpc';
import { paymentService } from './service';
import spaceService, { requireRowScope } from '../space/service';
import { requirePlatformStudio } from '../space/studio';
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
import { z } from 'zod';
import { confirmDeclared, rejectDeclared, type Actor } from './declare';
import { issuePaymentLink, revokePaymentLinks } from './link';

const RejectDeclaredSchema = GetPaymentByIdSchema.extend({ reason: z.string().trim().max(500).optional() });

const adminActor = (ctx: {
  user: { id: string };
  ipAddress?: string;
  userAgent?: string;
}): Actor => ({
  userId: ctx.user.id,
  via: 'admin',
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});

export const paymentRouter = router({
  list: memberProcedure.input(ListPaymentsSchema).query(async ({ ctx, input }) => {
    const { spaceId, ...params } = input;
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
    return paymentService.listPayments(ctx.db, params, scope);
  }),

  stats: memberProcedure.input(SpaceScopeSchema).query(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input?.spaceId);
    return paymentService.paymentStats(ctx.db, scope);
  }),

  getById: memberProcedure.input(GetPaymentByIdSchema).query(async ({ ctx, input }) => {
    return paymentService.getPaymentById(ctx.db, ctx.user.id, input.id);
  }),

  create: memberProcedure.input(CreatePaymentSchema).mutation(async ({ ctx, input }) => {
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

  createManual: memberProcedure.input(CreateManualPaymentSchema).mutation(async ({ ctx, input }) => {
    return paymentService.createManualPayment(ctx.db, ctx.user.id, input);
  }),

  setStatus: memberProcedure.input(SetPaymentStatusSchema).mutation(async ({ ctx, input }) => {
    return paymentService.setPaymentStatus(ctx.db, ctx.user.id, input);
  }),

  delete: memberProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    return paymentService.deletePayment(ctx.db, ctx.user.id, input.id);
  }),

  update: memberProcedure.input(UpdatePaymentSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    return paymentService.updatePayment(ctx.db, ctx.user.id, id, data, ctx.getStripe);
  }),

  cancel: memberProcedure.input(CancelPaymentSchema).mutation(async ({ ctx, input }) => {
    return paymentService.cancelPayment(ctx.db, ctx.user.id, await ctx.getStripe(), input.id);
  }),

  sendReminder: memberProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    const smtp = await ctx.getSmtp();
    await paymentService.sendReminder(ctx.db, ctx.user.id, smtp, ctx.env, ctx.appOrigin, input.id);
    return { success: true };
  }),

  markExpired: memberProcedure.input(SpaceScopeSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input?.spaceId);
    return paymentService.markExpiredPayments(ctx.db, scope);
  }),

  retryReceipts: memberProcedure.input(SpaceScopeSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input?.spaceId);
    const smtp = await ctx.getSmtp();
    return paymentService.retryFailedReceipts(ctx.db, ctx.storage, smtp, ctx.env, scope);
  }),

  myPayments: clientProcedure.query(async ({ ctx }) => {
    return paymentService.listClientPayments(ctx.db, ctx.user.id);
  }),

  confirmDeclared: memberProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    return confirmDeclared(ctx.db, ctx.user.id, input.id, adminActor(ctx));
  }),

  rejectDeclared: memberProcedure.input(RejectDeclaredSchema).mutation(async ({ ctx, input }) => {
    return rejectDeclared(ctx.db, ctx.user.id, input.id, input.reason, adminActor(ctx));
  }),

  dismissAttention: memberProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    const payment = await requireRowScope(
      ctx.db,
      ctx.user.id,
      await ctx.db.payment.findUnique({ where: { id: input.id } }),
      'Payment not found'
    );
    await ctx.db.auditLog.create({
      data: {
        userId: ctx.user.id,
        entity: 'payment',
        entityId: payment.id,
        action: 'UPDATE',
        changes: { event: 'payment.attention.dismissed', was: payment.needsAttention },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
    return ctx.db.payment.update({
      where: { id: payment.id },
      data: { needsAttention: null, attentionAt: null },
    });
  }),

  createLink: memberProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    const payment = await requireRowScope(
      ctx.db,
      ctx.user.id,
      await ctx.db.payment.findUnique({ where: { id: input.id } }),
      'Payment not found'
    );
    await requirePlatformStudio(ctx.db, payment.spaceId);
    return issuePaymentLink(ctx.db, payment.id, ctx.env.FRONTEND_URL);
  }),

  revokeLinks: memberProcedure.input(GetPaymentByIdSchema).mutation(async ({ ctx, input }) => {
    const payment = await requireRowScope(
      ctx.db,
      ctx.user.id,
      await ctx.db.payment.findUnique({ where: { id: input.id } }),
      'Payment not found'
    );
    return revokePaymentLinks(ctx.db, payment.id);
  }),
});

export default paymentRouter;
