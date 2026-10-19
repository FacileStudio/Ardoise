import { router, protectedProcedure, adminProcedure } from '../../trpc';
import clientService from './service';
import spaceService from '../space/service';
import {
  CreateClientSchema,
  UpdateClientSchema,
  ListClientsSchema,
  GetByIdSchema,
  TransferClientSchema,
} from './types';
import { dispatchConfiguredWebhook } from '../webhook/service';

export const clientRouter = router({
  list: adminProcedure.input(ListClientsSchema).query(async ({ ctx, input }) => {
    const { spaceId, ...params } = input;
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, spaceId);
    return clientService.listClients(ctx.db, params, scope);
  }),

  getById: adminProcedure.input(GetByIdSchema).query(async ({ ctx, input }) => {
    return clientService.getClientById(ctx.db, ctx.user.id, input.id);
  }),

  create: adminProcedure.input(CreateClientSchema).mutation(async ({ ctx, input }) => {
    const scope = await spaceService.resolveScope(ctx.db, ctx.user.id, input.spaceId);
    const client = await clientService.createClient(ctx.db, ctx.auth, input, scope);

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: 'client.created',
      actor: { id: ctx.user!.id, email: ctx.user!.email, role: ctx.user!.role },
      data: { client },
    });

    return client;
  }),

  update: adminProcedure.input(UpdateClientSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const client = await clientService.updateClient(ctx.db, ctx.user.id, id, data);

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: 'client.updated',
      actor: { id: ctx.user!.id, email: ctx.user!.email, role: ctx.user!.role },
      data: { clientId: id, client },
    });

    return client;
  }),

  transfer: adminProcedure.input(TransferClientSchema).mutation(async ({ ctx, input }) => {
    const target = await spaceService.resolveScope(ctx.db, ctx.user.id, input.targetSpaceId);
    const result = await clientService.transferClient(ctx.db, ctx.user.id, input, target);

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: result.relocated ? 'client.updated' : 'client.created',
      actor: { id: ctx.user!.id, email: ctx.user!.email, role: ctx.user!.role },
      data: { clientId: result.client.id, client: result.client },
    });

    return result;
  }),

  delete: adminProcedure.input(GetByIdSchema).mutation(async ({ ctx, input }) => {
    const result = await clientService.deleteClient(ctx.db, ctx.user.id, input.id);

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: 'client.deleted',
      actor: { id: ctx.user!.id, email: ctx.user!.email, role: ctx.user!.role },
      data: { clientId: input.id },
    });

    return result;
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return clientService.getClientByUserId(ctx.db, ctx.user.id);
  }),
});

export default clientRouter;
