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
    return prestationService.createPrestation(ctx.db, input, scope);
  }),

  update: adminProcedure.input(UpdatePrestationSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    return prestationService.updatePrestation(ctx.db, ctx.user.id, id, data);
  }),

  setStatus: adminProcedure.input(SetPrestationStatusSchema).mutation(async ({ ctx, input }) => {
    return prestationService.setStatus(ctx.db, ctx.user.id, input.id, input.status);
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

      return prestationService.createPayment(
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
    }),

  delete: adminProcedure.input(GetPrestationByIdSchema).mutation(async ({ ctx, input }) => {
    return prestationService.deletePrestation(ctx.db, ctx.user.id, input.id);
  }),
});

export default prestationRouter;
