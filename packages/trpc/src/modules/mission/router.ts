import { router, adminProcedure } from '../../trpc';
import missionService from './service';
import spaceService from '../space/service';
import {
  CreateMissionSchema,
  UpdateMissionSchema,
  ListMissionsSchema,
  GetMissionByIdSchema,
  SetMissionStatusSchema,
  MissionDocumentSchema,
  CreateMissionPaymentSchema,
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

export const missionRouter = router({
  list: adminProcedure.input(ListMissionsSchema).query(async ({ ctx, input }) => {
    const { spaceId, ...params } = input;
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
    return missionService.listMissions(ctx.db, params, scope);
  }),

  getById: adminProcedure.input(GetMissionByIdSchema).query(async ({ ctx, input }) => {
    return missionService.getMissionById(ctx.db, ctx.user.id, input.id);
  }),

  create: adminProcedure.input(CreateMissionSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input.spaceId);
    const mission = await missionService.createMission(ctx.db, input, scope);

    await emit(ctx, 'mission.created', { mission });

    return mission;
  }),

  update: adminProcedure.input(UpdateMissionSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const mission = await missionService.updateMission(ctx.db, ctx.user.id, id, data);

    await emit(ctx, 'mission.updated', { missionId: id, mission });

    return mission;
  }),

  setStatus: adminProcedure.input(SetMissionStatusSchema).mutation(async ({ ctx, input }) => {
    const mission = await missionService.setStatus(
      ctx.db,
      ctx.user.id,
      input.id,
      input.status
    );

    await emit(ctx, 'mission.status_changed', {
      missionId: input.id,
      status: mission.status,
    });

    return mission;
  }),

  attachDocument: adminProcedure
    .input(MissionDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      return missionService.attachDocument(ctx.db, ctx.user.id, input.id, input.documentId);
    }),

  detachDocument: adminProcedure
    .input(MissionDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      return missionService.detachDocument(ctx.db, ctx.user.id, input.id, input.documentId);
    }),

  createPayment: adminProcedure
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

      await emit(ctx, 'mission.payment_created', { missionId: input.id, payment });

      return payment;
    }),

  delete: adminProcedure.input(GetMissionByIdSchema).mutation(async ({ ctx, input }) => {
    const result = await missionService.deleteMission(ctx.db, ctx.user.id, input.id);

    await emit(ctx, 'mission.deleted', { missionId: input.id });

    return result;
  }),
});

export default missionRouter;
