import { createClient } from '@repo/trpc/client';
import type { AppRouter } from '@repo/trpc';
import type { CreateTRPCClient } from '@trpc/client';
import { getToken } from '@/lib/auth-context';

export const trpc: CreateTRPCClient<AppRouter> = createClient(
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/trpc',
  () => getToken() as any
);
