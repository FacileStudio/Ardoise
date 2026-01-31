import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './index';

export const createClient = (url: string, getToken?: () => string | null) =>
  createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        },
        headers: getToken
          ? () => {
              const token = getToken();
              return token ? { Authorization: `Bearer ${token}` } : {};
            }
          : undefined,
      }),
    ],
  });
