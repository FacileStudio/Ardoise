import {
  createTRPCProxyClient,
  httpBatchLink,
  splitLink,
  wsLink,
  createWSClient,
} from '@trpc/client';
import type { AppRouter } from '@repo/trpc';
import { get } from 'svelte/store';
import { auth } from '$lib/stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const baseHost = API_URL.replace(/\/trpc\/?$/, '');
const httpUrl = `${baseHost}/trpc`;
const wsUrl = baseHost.replace(/^http/, 'ws');

const getAuthToken = () => {
  const session = get(auth);
  return session?.session?.token;
};

const wsClient = createWSClient({
  url: wsUrl,
  connectionParams: () => {
    const token = getAuthToken();
    return token ? { token } : {};
  },
});

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: httpUrl,
        async headers() {
          const token = getAuthToken();
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-trpc-source': 'svelte-client',
          };
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        },
      }),
    }),
  ],
});
