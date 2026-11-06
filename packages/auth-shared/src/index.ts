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

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CLIENT]: 1,
  [UserRole.MEMBER]: 2,
  [UserRole.ADMIN]: 2,
};

export const hasAccess = (
  user: { role: UserRole } | null | undefined,
  requiredRole: UserRole
): boolean => {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Whether the user works in spaces (/admin) rather than in the client portal.
 * Says nothing about platform powers: those come only from the server's
 * PLATFORM_STAFF_SUBS check.
 */
export const isMember = (user: { role: UserRole } | null | undefined) =>
  hasAccess(user, UserRole.MEMBER);

export * from './store';
