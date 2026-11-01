import type { PrismaClient } from '@repo/types';
import type { AuthManager } from '@repo/auth';
import type { SessionUser } from '@repo/auth-shared';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../context';

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginGate {
  status: string;
  isBanned: boolean;
  isSuspended: boolean;
  suspendedUntil: Date | null;
}

export const sessionUserSelection = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  avatar: { select: { url: true } },
  coverImage: { select: { url: true } },
} as const;

export const toSessionUser = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: { url: string } | null;
  coverImage?: { url: string } | null;
}): SessionUser => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role as SessionUser['role'],
  avatarUrl: user.avatar?.url ?? null,
  coverImageUrl: user.coverImage?.url ?? null,
});

export const loginGateSelection = {
  status: true,
  isBanned: true,
  isSuspended: true,
  suspendedUntil: true,
} as const;

export const loginBlockReason = (user: LoginGate, now = new Date()): string | null => {
  if (user.isBanned || user.status === 'BANNED') return 'This account is banned';
  const suspended = user.isSuspended || user.status === 'SUSPENDED';
  if (suspended && (!user.suspendedUntil || user.suspendedUntil > now)) {
    return 'This account is suspended';
  }
  return null;
};

export const issueSession = async (
  db: PrismaClient,
  auth: AuthManager,
  sessionUser: SessionUser,
  meta?: SessionMeta
) => {
  const token = await auth.createToken(sessionUser);
  const refresh = await auth.createRefreshToken(sessionUser.id);

  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      userId: sessionUser.id,
      token: refresh.token,
      expiresAt: refresh.expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });

  return { token, refreshToken: refresh.token, user: sessionUser };
};

export interface CookieOptions {
  secure: boolean;
  domain?: string;
}

const cookie = (name: string, value: string, path: string, maxAge: number, opts: CookieOptions) =>
  [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    ...(opts.domain ? [`Domain=${opts.domain}`] : []),
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    ...(opts.secure ? ['Secure'] : []),
  ].join('; ');

export const cookieOptions = (env: { NODE_ENV?: string; COOKIE_DOMAIN?: string }): CookieOptions => ({
  secure: env.NODE_ENV === 'production',
  domain: env.COOKIE_DOMAIN,
});

const REFRESH_COOKIE_PATH = '/';
const LEGACY_REFRESH_COOKIE_PATH = '/trpc/auth.refresh';

export const authCookies = (accessToken: string, refreshToken: string, opts: CookieOptions) => [
  cookie(AUTH_COOKIE_NAME, accessToken, '/', 15 * 60, opts),
  cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_PATH, 7 * 24 * 60 * 60, opts),
  cookie(REFRESH_COOKIE_NAME, '', LEGACY_REFRESH_COOKIE_PATH, 0, opts),
];

export const clearedAuthCookies = (opts: CookieOptions) => [
  cookie(AUTH_COOKIE_NAME, '', '/', 0, opts),
  cookie(REFRESH_COOKIE_NAME, '', REFRESH_COOKIE_PATH, 0, opts),
  cookie(REFRESH_COOKIE_NAME, '', LEGACY_REFRESH_COOKIE_PATH, 0, opts),
];
