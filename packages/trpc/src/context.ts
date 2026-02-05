import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@repo/database';
import { type AuthManager } from '@repo/auth';
import { type ServerEnv } from '@repo/env';
import { StorageService } from '@repo/storage';
import { StripeService } from '@repo/stripe';
import type { Logger } from '@repo/logger';

export interface CreateContextOptions extends FetchCreateContextFnOptions {
  authManager: AuthManager;
  storage: StorageService;
  stripe: StripeService;
  env: ServerEnv;
  logger: Logger;
}

export const createContext = async ({
  req,
  authManager,
  storage,
  stripe,
  env,
  logger,
}: CreateContextOptions) => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const user = token ? await authManager.verifyToken(token) : null;
  const contextLogger = user ? logger.child({ userId: user.id, email: user.email }) : logger;
  const ipAddress =
    req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;

  return {
    user,
    db: prisma,
    auth: authManager,
    storage,
    stripe,
    env,
    ipAddress,
    userAgent,
    log: contextLogger,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
