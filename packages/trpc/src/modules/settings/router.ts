import { router, publicProcedure, adminProcedure } from '../../trpc';
import {
  UpdateSettingsSchema,
  UploadLogoSchema,
  ConfirmLogoUploadSchema,
} from './types';
import * as SettingsService from './service';

export const settingsRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    return SettingsService.getSettings(ctx.db);
  }),

  getAdmin: adminProcedure.query(async ({ ctx }) => {
    return SettingsService.getAdminSettings(ctx.db);
  }),

  update: adminProcedure
    .input(UpdateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return SettingsService.updateSettings(ctx.db, input);
    }),

  requestLogoUpload: adminProcedure
    .input(UploadLogoSchema)
    .mutation(async ({ ctx }) => {
      return SettingsService.requestLogoUpload(ctx.storage, ctx.apiOrigin, ctx.env.ENCRYPTION_SECRET);
    }),

  confirmLogoUpload: adminProcedure
    .input(ConfirmLogoUploadSchema)
    .mutation(async ({ ctx, input }) => {
      return SettingsService.confirmLogoUpload(ctx.db, input.logoUrl);
    }),
});
