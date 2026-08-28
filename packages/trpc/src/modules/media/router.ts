import { z } from 'zod';
import { router, protectedProcedure } from '../../trpc';
import mediaService from './service';

const uploadUrlSchema = z.object({
  fileName: z.string(),
  fileType: z.string()
});

const mediaSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  size: z.number(),
});

type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
type MediaInput = z.infer<typeof mediaSchema>;

export const mediaRouter = router({
  getUploadUrl: protectedProcedure
    .input(uploadUrlSchema)
    .mutation(async ({ ctx, input }) => {
      return mediaService.generateUploadUrl(
        ctx.user.id,
        input as UploadUrlInput,
        ctx.apiOrigin,
        ctx.env.ENCRYPTION_SECRET
      );
    }),

  getDownloadUrl: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const key = await mediaService.resolveDownloadKey(ctx.db, ctx.user.id, input.url);

      return {
        url: mediaService.generateDownloadUrl(key, ctx.apiOrigin, ctx.env.ENCRYPTION_SECRET),
      };
    }),

  updateAvatar: protectedProcedure.input(mediaSchema).mutation(async ({ ctx, input }) => {
    return mediaService.updateUserAvatar(ctx.db, ctx.storage, ctx.user.id, input as MediaInput);
  }),

  updateCover: protectedProcedure.input(mediaSchema).mutation(async ({ ctx, input }) => {
    return mediaService.updateUserCover(ctx.db, ctx.storage, ctx.user.id, input as MediaInput);
  }),

  removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    return mediaService.removeUserAvatar(ctx.db, ctx.storage, ctx.user.id);
  }),

  removeCover: protectedProcedure.mutation(async ({ ctx }) => {
    return mediaService.removeUserCover(ctx.db, ctx.storage, ctx.user.id);
  }),
});

export default mediaRouter;
