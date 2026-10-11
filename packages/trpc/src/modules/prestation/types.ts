import { z } from 'zod';
import { PaymentCollectionMethodSchema, PaymentFrequencySchema } from '../payment/types';

export const PrestationStatusSchema = z.enum([
  'DRAFT',
  'QUOTED',
  'ACCEPTED',
  'INVOICED',
  'PAID',
  'CANCELLED',
]);
export const PrestationProviderRoleSchema = z.enum(['LEAD', 'SUBCONTRACTOR']);

const ProviderLinkSchema = z.object({
  providerId: z.string().min(1),
  role: PrestationProviderRoleSchema.default('LEAD'),
});

export const CreatePrestationSchema = z.object({
  spaceId: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  clientId: z.string().min(1),
  providers: z.array(ProviderLinkSchema).default([]),
});

export const UpdatePrestationSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  providers: z.array(ProviderLinkSchema).optional(),
});

export const ListPrestationsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: PrestationStatusSchema.optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  spaceId: z.string().optional(),
});

export const GetPrestationByIdSchema = z.object({
  id: z.string().min(1),
});

export const SetPrestationStatusSchema = z.object({
  id: z.string().min(1),
  status: PrestationStatusSchema,
});

export const PrestationDocumentSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
});

export const CreatePrestationPaymentSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  collectionMethod: PaymentCollectionMethodSchema.default('STRIPE'),
  frequency: PaymentFrequencySchema.default('ONE_TIME'),
  dueDate: z.coerce.date().optional(),
});

export type CreatePrestationInput = z.infer<typeof CreatePrestationSchema>;
export type UpdatePrestationInput = z.infer<typeof UpdatePrestationSchema>;
export type ListPrestationsInput = z.infer<typeof ListPrestationsSchema>;
export type ListPrestationsParams = Omit<ListPrestationsInput, 'spaceId'>;
export type CreatePrestationPaymentInput = z.infer<typeof CreatePrestationPaymentSchema>;
export type ProviderLink = z.infer<typeof ProviderLinkSchema>;
