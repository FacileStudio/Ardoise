import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@repo/trpc';

interface TrpcConfig {
  baseUrl: string;
  getToken: () => string | null | Promise<string | null>;
  onUnauthorized: () => void;
}

export const createUniversalTrpcClient = (config: TrpcConfig) => {
  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');

  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: cleanBaseUrl,
        async headers() {
          const token = await config.getToken();
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-trpc-source': 'universal-client',
          };
        },
        fetch: async (url, options) => {
          const res = await fetch(url, options);

          if (
            res.status === 401 &&
            typeof window !== 'undefined' &&
            !window.location.pathname.includes('/login')
          ) {
            config.onUnauthorized();
          }

          return res;
        },
      }),
    ],
  });
};
