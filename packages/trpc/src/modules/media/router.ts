import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import mediaService from './service';

const mediaSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  size: z.number(),
});

export const mediaRouter = router({
  getUploadUrl: protectedProcedure
    .input(z.object({ fileName: z.string(), fileType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return mediaService.generateUploadUrl(ctx.storage, ctx.user.id, input);
    }),

  updateAvatar: protectedProcedure.input(mediaSchema).mutation(async ({ ctx, input }) => {
    return mediaService.updateUserAvatar(ctx.db, ctx.storage, ctx.user.id, input);
  }),

  updateCover: protectedProcedure.input(mediaSchema).mutation(async ({ ctx, input }) => {
    return mediaService.updateUserCover(ctx.db, ctx.storage, ctx.user.id, input);
  }),

  removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    return mediaService.removeUserAvatar(ctx.db, ctx.storage, ctx.user.id);
  }),

  removeCover: protectedProcedure.mutation(async ({ ctx }) => {
    return mediaService.removeUserCover(ctx.db, ctx.storage, ctx.user.id);
  }),
});

export default mediaRouter;
