import { router, protectedProcedure, adminProcedure } from '../../trpc';
import clientService from './service';
import {
  CreateClientSchema,
  UpdateClientSchema,
  ListClientsSchema,
  GetByIdSchema,
} from './types';

export const clientRouter = router({
  list: adminProcedure.input(ListClientsSchema).query(async ({ ctx, input }) => {
    return clientService.listClients(ctx.db, input);
  }),

  getById: adminProcedure.input(GetByIdSchema).query(async ({ ctx, input }) => {
    return clientService.getClientById(ctx.db, input.id);
  }),

  create: adminProcedure.input(CreateClientSchema).mutation(async ({ ctx, input }) => {
    return clientService.createClient(ctx.db, ctx.auth, input);
  }),

  update: adminProcedure.input(UpdateClientSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    return clientService.updateClient(ctx.db, id, data);
  }),

  delete: adminProcedure.input(GetByIdSchema).mutation(async ({ ctx, input }) => {
    return clientService.deleteClient(ctx.db, input.id);
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return clientService.getClientByUserId(ctx.db, ctx.user.id);
  }),
});

export default clientRouter;
