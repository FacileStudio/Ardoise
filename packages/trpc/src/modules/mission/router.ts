import { router, memberProcedure } from '../../trpc';
import missionService from './service';
import { generateQuote, acceptQuote, generateInvoice } from './billing';
import spaceService from '../space/service';
import {
  CreateMissionSchema,
  UpdateMissionSchema,
  ListMissionsSchema,
  GetMissionByIdSchema,
  SetMissionStatusSchema,
  MissionDocumentSchema,
  CreateMissionPaymentSchema,
  SetPrestationsSchema,
  GenerateQuoteSchema,
  AcceptQuoteSchema,
  GenerateInvoiceSchema,
} from './types';
import { dispatchConfiguredWebhook } from '../webhook/service';
import { emitMissionToGlouton } from '../webhook/glouton';

type EventContext = Pick<Parameters<typeof dispatchConfiguredWebhook>[0], 'db' | 'log'> & {
  user: { id: string; email: string; role: string };
};

const emit = (ctx: EventContext, spaceId: string, event: string, data: Record<string, unknown>) =>
  dispatchConfiguredWebhook({
    db: ctx.db,
    log: ctx.log,
    spaceId,
    event,
    actor: { id: ctx.user.id, email: ctx.user.email, role: ctx.user.role },
    data,
  });

/** The space of a mission for its webhook event; an unknown mission maps to no space, so nothing is sent. */
async function missionSpace(ctx: EventContext, id: string): Promise<string> {
  const mission = await ctx.db.mission.findUnique({ where: { id }, select: { spaceId: true } });
  return mission?.spaceId ?? '';
}

export const missionRouter = router({
  list: memberProcedure.input(ListMissionsSchema).query(async ({ ctx, input }) => {
    const { spaceId, ...params } = input;
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
    return missionService.listMissions(ctx.db, params, scope);
  }),

  getById: memberProcedure.input(GetMissionByIdSchema).query(async ({ ctx, input }) => {
    return missionService.getMissionById(ctx.db, ctx.user.id, input.id);
  }),

  create: memberProcedure.input(CreateMissionSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input.spaceId);
    const mission = await missionService.createMission(ctx.db, input, scope);

    await emit(ctx, mission.spaceId, 'mission.created', { mission });

    return mission;
  }),

  update: memberProcedure.input(UpdateMissionSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const mission = await missionService.updateMission(ctx.db, ctx.user.id, id, data);

    await emit(ctx, mission.spaceId, 'mission.updated', { missionId: id, mission });

    return mission;
  }),

  setPrestations: memberProcedure.input(SetPrestationsSchema).mutation(async ({ ctx, input }) => {
    const prestations = await missionService.setPrestations(
      ctx.db,
      ctx.user.id,
      input.id,
      input.prestations
    );

    await emit(ctx, await missionSpace(ctx, input.id), 'mission.prestations_updated', { missionId: input.id });

    return prestations;
  }),

  generateQuote: memberProcedure.input(GenerateQuoteSchema).mutation(async ({ ctx, input }) => {
    const document = await generateQuote(ctx.db, ctx.storage, ctx.user.id, input);

    await emit(ctx, document.spaceId, 'mission.quote_generated', { missionId: input.id, document });
    emitMissionToGlouton(ctx, 'mission.quote_generated', input.id, {
      amount: document.total,
      documentNumber: document.quoteNumber,
    });

    return document;
  }),

  acceptQuote: memberProcedure.input(AcceptQuoteSchema).mutation(async ({ ctx, input }) => {
    const document = await acceptQuote(ctx.db, ctx.user.id, input);

    await emit(ctx, document.spaceId, 'mission.quote_accepted', { missionId: input.id, document });
    emitMissionToGlouton(ctx, 'mission.quote_accepted', input.id, {
      amount: document.total,
      documentNumber: document.quoteNumber,
    });

    return document;
  }),

  generateInvoice: memberProcedure.input(GenerateInvoiceSchema).mutation(async ({ ctx, input }) => {
    const document = await generateInvoice(ctx.db, ctx.storage, ctx.user.id, input);

    await emit(ctx, document.spaceId, 'mission.invoice_generated', { missionId: input.id, document });
    emitMissionToGlouton(ctx, 'mission.invoice_generated', input.id, {
      amount: document.total,
      documentNumber: document.invoiceNumber,
    });

    return document;
  }),

  setStatus: memberProcedure.input(SetMissionStatusSchema).mutation(async ({ ctx, input }) => {
    const mission = await missionService.setStatus(ctx.db, ctx.user.id, input.id, input.status);

    await emit(ctx, mission.spaceId, 'mission.status_changed', {
      missionId: input.id,
      status: mission.status,
    });

    return mission;
  }),

  attachDocument: memberProcedure.input(MissionDocumentSchema).mutation(async ({ ctx, input }) => {
    return missionService.attachDocument(ctx.db, ctx.user.id, input.id, input.documentId);
  }),

  detachDocument: memberProcedure.input(MissionDocumentSchema).mutation(async ({ ctx, input }) => {
    return missionService.detachDocument(ctx.db, ctx.user.id, input.id, input.documentId);
  }),

  createPayment: memberProcedure
    .input(CreateMissionPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const useStripe = input.collectionMethod === 'STRIPE';

      const payment = await missionService.createPayment(
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

      await emit(ctx, payment.spaceId, 'mission.payment_created', { missionId: input.id, payment });
      emitMissionToGlouton(ctx, 'mission.payment_created', input.id, {
        amount: payment.amount,
        documentNumber: payment.reference,
      });

      return payment;
    }),

  delete: memberProcedure.input(GetMissionByIdSchema).mutation(async ({ ctx, input }) => {
    const spaceId = await missionSpace(ctx, input.id);
    const result = await missionService.deleteMission(ctx.db, ctx.user.id, input.id);

    await emit(ctx, spaceId, 'mission.deleted', { missionId: input.id });

    return result;
  }),
});

export default missionRouter;
