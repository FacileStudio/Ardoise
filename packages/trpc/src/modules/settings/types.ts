import { z } from 'zod';

export const UpdateSettingsSchema = z.object({
  companyName: z.string().optional(),
  companyLegal: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  companyCountry: z.string().optional(),
  companySiret: z.string().optional(),
  companyEmail: z.string().email().optional().or(z.literal('')),
  companyPhone: z.string().optional(),
  stripeSecretKey: z.string().startsWith('sk_').optional().or(z.literal('')),
  stripeWebhookSecret: z.string().startsWith('whsec_').optional().or(z.literal('')),
  stripePublishableKey: z.string().startsWith('pk_').optional().or(z.literal('')),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().email().optional().or(z.literal('')),
  docusealApiUrl: z.string().url().optional().or(z.literal('')),
  docusealApiKey: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().optional(),
  webhookEvents: z.array(z.string().min(1)).optional().nullable(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  tvaRate: z.number().min(0).max(100).optional(),
});

export const UploadLogoSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
});

export const ConfirmLogoUploadSchema = z.object({
  logoUrl: z.string().url(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type UploadLogoInput = z.infer<typeof UploadLogoSchema>;
export type ConfirmLogoUploadInput = z.infer<typeof ConfirmLogoUploadSchema>;
