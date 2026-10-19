import { z } from 'zod';
import { UserRole } from '@repo/types';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
}

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.nativeEnum(UserRole),
  avatarUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
});

export interface AuthState {
  user: SessionUser | null;
  // The token lives only in httpOnly cookies; this tracks whether we believe a session is active.
  session: boolean;
  loading: boolean;
}

export const loginSchema = z.object({
  email: z.string().min(1, "L'email est requis").email("Format d'email invalide"),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
});

export type LoginInput = z.infer<typeof loginSchema>;

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CLIENT]: 1,
  [UserRole.ADMIN]: 2,
};

export const hasAccess = (
  user: { role: UserRole } | null | undefined,
  requiredRole: UserRole
): boolean => {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
};

export const isAdmin = (user: { role: UserRole } | null | undefined) =>
  user?.role === UserRole.ADMIN;

export * from './store';
