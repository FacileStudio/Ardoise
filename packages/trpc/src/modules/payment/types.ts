import { z } from 'zod';

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'PAST_DUE',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'PROCESSING',
  'AWAITING_CONFIRMATION',
]);
export const PaymentFrequencySchema = z.enum(['ONE_TIME', 'MONTHLY', 'YEARLY']);
export const PaymentCollectionMethodSchema = z.enum(['STRIPE', 'MANUAL']);

export const CreatePaymentSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  frequency: PaymentFrequencySchema.default('ONE_TIME'),
  collectionMethod: PaymentCollectionMethodSchema.default('STRIPE'),
  reference: z.string().optional(),
  dueDate: z.coerce.date(),
  attachedFiles: z.array(z.string().url()).optional().default([]),
  attachedDocumentIds: z.array(z.string()).optional().default([]),
  missionId: z.string().optional(),
  documentId: z.string().optional(),
});

export const CreateManualPaymentSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().trim().min(1, 'Description is required'),
  reference: z.string().optional(),
  dueDate: z.coerce.date(),
  missionId: z.string().optional(),
  documentId: z.string().optional(),
  paid: z.boolean().default(false),
  paidAt: z.coerce.date().optional(),
});

export const SetPaymentStatusSchema = z.object({
  id: z.string().min(1, 'Payment ID is required'),
  status: z.enum(['PAID', 'PENDING']),
  paidAt: z.coerce.date().optional(),
});

export const UpdatePaymentSchema = z.object({
  id: z.string().min(1, 'Payment ID is required'),
  paidAt: z.coerce.date().nullable().optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1).optional(),
  dueDate: z.coerce.date().optional(),
  status: PaymentStatusSchema.optional(),
  collectionMethod: PaymentCollectionMethodSchema.optional(),
  reference: z.string().optional(),
  attachedFiles: z.array(z.string().url()).optional(),
  attachedDocumentIds: z.array(z.string()).optional(),
});

export const ListPaymentsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  status: PaymentStatusSchema.optional(),
  clientId: z.string().optional(),
  search: z.string().trim().optional(),
  spaceId: z.string().optional(),
});

export const SpaceScopeSchema = z
  .object({
    spaceId: z.string().optional(),
  })
  .optional();

export const GetPaymentByIdSchema = z.object({
  id: z.string().min(1, 'Payment ID is required'),
});

export const CancelPaymentSchema = z.object({
  id: z.string().min(1, 'Payment ID is required'),
});

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentFrequency = z.infer<typeof PaymentFrequencySchema>;
export type PaymentCollectionMethod = z.infer<typeof PaymentCollectionMethodSchema>;
export type CreateManualPaymentInput = z.infer<typeof CreateManualPaymentSchema>;
export type SetPaymentStatusInput = z.infer<typeof SetPaymentStatusSchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;
export type ListPaymentsInput = z.infer<typeof ListPaymentsSchema>;
export type ListPaymentsParams = Omit<ListPaymentsInput, 'spaceId'>;
export type GetPaymentByIdInput = z.infer<typeof GetPaymentByIdSchema>;
export type CancelPaymentInput = z.infer<typeof CancelPaymentSchema>;
