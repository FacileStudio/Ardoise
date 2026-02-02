import { z } from 'zod';
import { UserRole } from '@repo/types';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isPremium: boolean;
  avatarUrl?: string | null;
}

export interface AuthState {
  user: SessionUser | null;
  session: { token: string } | null;
  loading: boolean;
}

export const loginSchema = z.object({
  email: z.string().min(1, "L'email est requis").email("Format d'email invalide"),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
});

export const registerSchema = loginSchema
  .extend({
    firstName: z.string().min(1, 'Le prénom est requis'),
    lastName: z.string().min(1, 'Le nom de famille est requis'),
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
};

export const hasAccess = (
  user: SessionUser | null | undefined,
  requiredRole: UserRole
): boolean => {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
};

export const isAdmin = (user: SessionUser | null | undefined) => user?.role === UserRole.ADMIN;

export * from './store';
