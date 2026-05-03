import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@repo/database';
import { type AuthManager } from '@repo/auth';
import { type ServerEnv } from '@repo/env';
import { StorageService } from '@repo/storage';
import type { Logger } from '@repo/logger';
import { DocuSealService } from './modules/docuseal/service';
import { getSmtpClient, getStripeService } from './modules/settings/service';

export interface CreateContextOptions extends FetchCreateContextFnOptions {
  authManager: AuthManager;
  storage: StorageService;
  docuseal: DocuSealService;
  env: ServerEnv;
  logger: Logger;
}

export const createContext = async ({
  req,
  authManager,
  storage,
  docuseal,
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
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const origin = req.headers.get('origin');
  const apiOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';
  const appOrigin = origin || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : '');

  return {
    user,
    db: prisma,
    auth: authManager,
    storage,
    getStripe: () => getStripeService(prisma),
    getSmtp: () => getSmtpClient(prisma),
    docuseal,
    env,
    apiOrigin,
    appOrigin,
    ipAddress,
    userAgent,
    log: contextLogger,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
