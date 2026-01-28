import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { contactSchema } from '@repo/validators';
import { contactService } from './service';
import { z } from 'zod';

export const contactRouter = router({
  create: publicProcedure.input(contactSchema).mutation(async ({ ctx, input }) => {
    return contactService.create(ctx.db, input);
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return contactService.list(ctx.db);
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return contactService.delete(ctx.db, input.id);
  }),
});
