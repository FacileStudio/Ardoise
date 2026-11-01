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
