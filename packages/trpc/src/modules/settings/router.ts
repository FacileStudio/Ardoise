import { router, publicProcedure, adminProcedure } from '../../trpc';
import {
  UpdateSettingsSchema,
  UploadLogoSchema,
  ConfirmLogoUploadSchema,
} from './types';
import * as SettingsService from './service';
import { dispatchConfiguredWebhook } from '../webhook/service';

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
      const before = await SettingsService.getSettingsRecord(ctx.db);
      const result = await SettingsService.updateSettings(ctx.db, input);
      const after = await SettingsService.getSettingsRecord(ctx.db);
      const changedFields = Object.entries(input)
        .filter(([key, value]) => !SettingsService.secretFields.includes(key as never) || value !== '')
        .map(([key]) => key);

      await dispatchConfiguredWebhook({
        db: ctx.db,
        log: ctx.log,
        event: 'settings.updated',
        actor: {
          id: ctx.user!.id,
          email: ctx.user!.email,
          role: ctx.user!.role,
        },
        data: {
          changedFields,
          before: SettingsService.redactSecrets(before as unknown as Record<string, unknown>),
          after: SettingsService.redactSecrets(after as unknown as Record<string, unknown>),
        },
      });

      return result;
    }),

  requestLogoUpload: adminProcedure
    .input(UploadLogoSchema)
    .mutation(async ({ ctx }) => {
      return SettingsService.requestLogoUpload(ctx.storage, ctx.apiOrigin, ctx.env.ENCRYPTION_SECRET);
    }),

  confirmLogoUpload: adminProcedure
    .input(ConfirmLogoUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await SettingsService.confirmLogoUpload(ctx.db, input.logoUrl);

      await dispatchConfiguredWebhook({
        db: ctx.db,
        log: ctx.log,
        event: 'settings.logo.updated',
        actor: {
          id: ctx.user!.id,
          email: ctx.user!.email,
          role: ctx.user!.role,
        },
        data: {
          logoUrl: input.logoUrl,
        },
      });

      return result;
    }),
});
