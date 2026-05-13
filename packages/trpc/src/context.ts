import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@repo/database';
import { type AuthManager, type TokenUser } from '@repo/auth';
import { type ServerEnv } from '@repo/env';
import { StorageService } from '@repo/storage';
import type { Logger } from '@repo/logger';
import { getDocuSealService, getSmtpClient, getStripeService } from './modules/settings/service';

export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

export function extractCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface CreateContextOptions extends FetchCreateContextFnOptions {
  authManager: AuthManager;
  storage: StorageService;
  env: ServerEnv;
  logger: Logger;
}

export const createContext = async ({
  req,
  resHeaders,
  authManager,
  storage,
  env,
  logger,
}: CreateContextOptions) => {
  const cookieToken = extractCookie(req.headers.get('cookie'), AUTH_COOKIE_NAME);
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || bearerToken;
  const user = token ? await authManager.verifyToken(token) : null;
  const contextLogger = user ? logger.child({ userId: user.id, email: user.email }) : logger;
  const ipAddress =
    req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const origin = req.headers.get('origin');
  const apiOrigin = env.BACKEND_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : '');
  const appOrigin = origin || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : '');

  return {
    req,
    user,
    db: prisma,
    auth: authManager,
    storage,
    resHeaders,
    getStripe: () => getStripeService(prisma),
    getSmtp: () => getSmtpClient(prisma),
    docuseal: await getDocuSealService(prisma),
    env,
    apiOrigin,
    appOrigin,
    ipAddress,
    userAgent,
    log: contextLogger,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
