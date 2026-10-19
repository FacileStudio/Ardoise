import { z } from 'zod';

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['CLIENT', 'ADMIN']).default('CLIENT'),
});

export const InvitationIdSchema = z.object({ id: z.string() });

export const InvitationTokenSchema = z.object({ token: z.string().min(1) });

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  password: z.string().min(8),
});

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;
