import { z } from 'zod';

export const SpaceRoleEnum = z.enum(['OWNER', 'ADMIN', 'MEMBER']);

export const CreateSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const UpdateSpaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const GetSpaceSchema = z.object({
  id: z.string(),
});

export const AddMemberSchema = z.object({
  spaceId: z.string(),
  email: z.string().email(),
  role: SpaceRoleEnum.optional().default('MEMBER'),
});


export const RemoveMemberSchema = z.object({
  spaceId: z.string(),
  userId: z.string(),
});

export const UpdateMemberRoleSchema = z.object({
  spaceId: z.string(),
  userId: z.string(),
  role: SpaceRoleEnum,
});

export const LeaveSpaceSchema = z.object({
  spaceId: z.string(),
});

export type CreateSpaceInput = z.infer<typeof CreateSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof UpdateSpaceSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export type RemoveMemberInput = z.infer<typeof RemoveMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

const NumberFormat = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine(
    (value) => value.endsWith('{{number}}') && value.split('{{number}}').length === 2,
    'The format must end with {{number}}, used once'
  )
  .refine((value) => /^[\p{L}\p{N} _./{}-]+$/u.test(value), 'The format holds unsupported characters');

const Mention = z.string().trim().max(1000).nullable();

export const UpdateSpaceSettingsSchema = z
  .object({
    id: z.string().min(1),
    invoiceNumberFormat: NumberFormat.optional(),
    quoteNumberFormat: NumberFormat.optional(),
    paymentTermsDays: z.number().int().min(0).max(365).optional(),
    lateFeeRate: z.string().trim().min(1).max(500).optional(),
    recoveryFeeAmount: z.number().min(0).max(100000).optional(),
    vatExempt: z.boolean().optional(),
    vatExemptionMention: Mention.optional(),
    legalMentions: Mention.optional(),
    webhookUrl: z.string().trim().url().max(2000).nullable().optional(),
    webhookSecret: z.string().min(16).max(256).nullable().optional(),
    webhookEvents: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  })
  .strict();

export type UpdateSpaceSettingsInput = z.infer<typeof UpdateSpaceSettingsSchema>;
