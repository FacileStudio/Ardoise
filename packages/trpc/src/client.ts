import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './index';

export const createClient = (url: string, getToken?: () => string | null) =>
  createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url,
        async headers() {
          const headers: Record<string, string> = {
            'x-trpc-source': 'svelte',
          };

          if (getToken) {
            const token = getToken();
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }
          }
          return headers;
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        },
      }),
    ],
  });
