import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './index';

export const createClient = (url: string, getToken?: () => string) =>
  createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        headers: getToken
          ? () => {
              const token = getToken();
              return token ? { Authorization: `Bearer ${token}` } : {};
            }
          : undefined,
      }),
    ],
  });
