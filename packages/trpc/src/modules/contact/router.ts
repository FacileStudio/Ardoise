import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import contactService from './service';

const contactSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  firstName: z
    .string()
    .min(1, 'This field is required')
    .max(50, 'Name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'This field is required')
    .max(50, 'Name must be less than 50 characters'),
});

export const contactRouter = router({
  create: publicProcedure.input(contactSchema).mutation(async ({ ctx, input }) => {
    return contactService.create(ctx.db, input);
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return contactService.list(ctx.db);
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return contactService.delete(ctx.db, input.id);
    }),
});

export default contactRouter;
