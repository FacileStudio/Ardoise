import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { prisma } from '@repo/database';
import { type AuthManager } from '@repo/auth';
import { type ServerEnv } from '@repo/env';
import { StorageService } from '@repo/storage';
import { StripeService } from '@repo/stripe';

export interface CreateContextOptions extends FetchCreateContextFnOptions {
  authManager: AuthManager;
  storage: StorageService;
  stripe: StripeService;
  env: ServerEnv;
}

export const createContext = async ({
  req,
  authManager,
  storage,
  stripe,
  env,
}: CreateContextOptions) => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const user = token ? await authManager.verifyToken(token) : null;

  return {
    user,
    db: prisma,
    auth: authManager,
    storage,
    stripe,
    env,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
