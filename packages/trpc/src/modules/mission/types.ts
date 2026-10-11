import { z } from 'zod';
import { PaymentCollectionMethodSchema, PaymentFrequencySchema } from '../payment/types';

export const MissionStatusSchema = z.enum([
  'DRAFT',
  'QUOTED',
  'ACCEPTED',
  'INVOICED',
  'PAID',
  'CANCELLED',
]);
export const MissionProviderRoleSchema = z.enum(['LEAD', 'SUBCONTRACTOR']);

const DepositPercentSchema = z.number().gt(0).lte(100);

const ProviderLinkSchema = z.object({
  providerId: z.string().min(1),
  role: MissionProviderRoleSchema.default('LEAD'),
});

export const CreateMissionSchema = z.object({
  spaceId: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  clientId: z.string().min(1),
  depositPercent: DepositPercentSchema.optional(),
  providers: z.array(ProviderLinkSchema).default([]),
});

export const UpdateMissionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  depositPercent: DepositPercentSchema.nullable().optional(),
  providers: z.array(ProviderLinkSchema).optional(),
});

export const ListMissionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: MissionStatusSchema.optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  spaceId: z.string().optional(),
});

export const GetMissionByIdSchema = z.object({
  id: z.string().min(1),
});

export const SetMissionStatusSchema = z.object({
  id: z.string().min(1),
  status: MissionStatusSchema,
});

export const MissionDocumentSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
});

export const CreateMissionPaymentSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  collectionMethod: PaymentCollectionMethodSchema.default('STRIPE'),
  frequency: PaymentFrequencySchema.default('ONE_TIME'),
  dueDate: z.coerce.date().optional(),
});

export const PrestationLineSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(100000),
  unit: z.string().trim().min(1).max(30).default('jour'),
  unitPrice: z.number().nonnegative().max(10000000),
  providerId: z.string().min(1).nullable().optional(),
});

export const SetPrestationsSchema = z.object({
  id: z.string().min(1),
  prestations: z.array(PrestationLineSchema).max(200),
});

export const GenerateQuoteSchema = z.object({
  id: z.string().min(1),
  validityDays: z.number().int().min(1).max(365).default(30),
});

export const AcceptQuoteSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
});

export const GenerateInvoiceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['TOTAL', 'DEPOSIT']).default('TOTAL'),
  dueDate: z.coerce.date().optional(),
});

export type CreateMissionInput = z.infer<typeof CreateMissionSchema>;
export type UpdateMissionInput = z.infer<typeof UpdateMissionSchema>;
export type ListMissionsInput = z.infer<typeof ListMissionsSchema>;
export type ListMissionsParams = Omit<ListMissionsInput, 'spaceId'>;
export type CreateMissionPaymentInput = z.infer<typeof CreateMissionPaymentSchema>;
export type ProviderLink = z.infer<typeof ProviderLinkSchema>;
export type PrestationLineInput = z.infer<typeof PrestationLineSchema>;
export type GenerateQuoteInput = z.infer<typeof GenerateQuoteSchema>;
export type AcceptQuoteInput = z.infer<typeof AcceptQuoteSchema>;
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceSchema>;
