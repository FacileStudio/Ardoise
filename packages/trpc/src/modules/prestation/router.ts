import { router, adminProcedure } from '../../trpc';
import prestationService from './service';
import spaceService from '../space/service';
import {
  CreatePrestationSchema,
  UpdatePrestationSchema,
  ListPrestationsSchema,
  GetPrestationByIdSchema,
  SetPrestationStatusSchema,
  PrestationDocumentSchema,
  CreatePrestationPaymentSchema,
} from './types';
import { dispatchConfiguredWebhook } from '../webhook/service';

type EventContext = Pick<Parameters<typeof dispatchConfiguredWebhook>[0], 'db' | 'log'> & {
  user: { id: string; email: string; role: string };
};

const emit = (ctx: EventContext, event: string, data: Record<string, unknown>) =>
  dispatchConfiguredWebhook({
    db: ctx.db,
    log: ctx.log,
    event,
    actor: { id: ctx.user.id, email: ctx.user.email, role: ctx.user.role },
    data,
  });

export const prestationRouter = router({
  list: adminProcedure.input(ListPrestationsSchema).query(async ({ ctx, input }) => {
    const { spaceId, ...params } = input;
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
    return prestationService.listPrestations(ctx.db, params, scope);
  }),

  getById: adminProcedure.input(GetPrestationByIdSchema).query(async ({ ctx, input }) => {
    return prestationService.getPrestationById(ctx.db, ctx.user.id, input.id);
  }),

  create: adminProcedure.input(CreatePrestationSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input.spaceId);
    const prestation = await prestationService.createPrestation(ctx.db, input, scope);

    await emit(ctx, 'prestation.created', { prestation });

    return prestation;
  }),

  update: adminProcedure.input(UpdatePrestationSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const prestation = await prestationService.updatePrestation(ctx.db, ctx.user.id, id, data);

    await emit(ctx, 'prestation.updated', { prestationId: id, prestation });

    return prestation;
  }),

  setStatus: adminProcedure.input(SetPrestationStatusSchema).mutation(async ({ ctx, input }) => {
    const prestation = await prestationService.setStatus(
      ctx.db,
      ctx.user.id,
      input.id,
      input.status
    );

    await emit(ctx, 'prestation.status_changed', {
      prestationId: input.id,
      status: prestation.status,
    });

    return prestation;
  }),

  attachDocument: adminProcedure
    .input(PrestationDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      return prestationService.attachDocument(ctx.db, ctx.user.id, input.id, input.documentId);
    }),

  detachDocument: adminProcedure
    .input(PrestationDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      return prestationService.detachDocument(ctx.db, ctx.user.id, input.id, input.documentId);
    }),

  createPayment: adminProcedure
    .input(CreatePrestationPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const useStripe = input.collectionMethod === 'STRIPE';

      const payment = await prestationService.createPayment(
        ctx.db,
        ctx.user.id,
        {
          stripe: useStripe ? await ctx.getStripe() : null,
          smtp: useStripe ? await ctx.getSmtp() : null,
          env: ctx.env,
          appOrigin: ctx.appOrigin,
        },
        input
      );

      await emit(ctx, 'prestation.payment_created', { prestationId: input.id, payment });

      return payment;
    }),

  delete: adminProcedure.input(GetPrestationByIdSchema).mutation(async ({ ctx, input }) => {
    const result = await prestationService.deletePrestation(ctx.db, ctx.user.id, input.id);

    await emit(ctx, 'prestation.deleted', { prestationId: input.id });

    return result;
  }),
});

export default prestationRouter;
