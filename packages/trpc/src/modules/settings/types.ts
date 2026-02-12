import { z } from 'zod';

export const UpdateSettingsSchema = z.object({
  companyName: z.string().optional(),
  companyLegal: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  companyCountry: z.string().optional(),
  companySiret: z.string().optional(),
  companyEmail: z.string().email().optional(),
  companyPhone: z.string().optional(),
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
