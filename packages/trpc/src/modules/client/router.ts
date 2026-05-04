import { router, protectedProcedure, adminProcedure } from '../../trpc';
import clientService from './service';
import {
  CreateClientSchema,
  UpdateClientSchema,
  ListClientsSchema,
  GetByIdSchema,
} from './types';
import { dispatchConfiguredWebhook } from '../webhook/service';

export const clientRouter = router({
  list: adminProcedure.input(ListClientsSchema).query(async ({ ctx, input }) => {
    return clientService.listClients(ctx.db, input);
  }),

  getById: adminProcedure.input(GetByIdSchema).query(async ({ ctx, input }) => {
    return clientService.getClientById(ctx.db, input.id);
  }),

  create: adminProcedure.input(CreateClientSchema).mutation(async ({ ctx, input }) => {
    const client = await clientService.createClient(ctx.db, ctx.auth, input);

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
    const client = await clientService.updateClient(ctx.db, id, data);

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: 'client.updated',
      actor: { id: ctx.user!.id, email: ctx.user!.email, role: ctx.user!.role },
      data: { clientId: id, client },
    });

    return client;
  }),

  delete: adminProcedure.input(GetByIdSchema).mutation(async ({ ctx, input }) => {
    const result = await clientService.deleteClient(ctx.db, input.id);

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
