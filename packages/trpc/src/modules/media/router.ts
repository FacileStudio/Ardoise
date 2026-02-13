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
      return mediaService.generateUploadUrl(ctx.storage, ctx.user.id, input);
    }),

  getDownloadUrl: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const urlPath = new URL(input.url).pathname;
      const pathParts = urlPath.split('/').filter(Boolean);
      const uploadsIndex = pathParts.indexOf('uploads');

      if (uploadsIndex === -1) {
        throw new Error('Invalid file URL: uploads folder not found');
      }

      const filePath = pathParts.slice(uploadsIndex).join('/');

      return {
        url: ctx.storage.getPresignedUrl(filePath, 3600),
      };
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
