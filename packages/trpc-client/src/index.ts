import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@repo/trpc';

interface TrpcConfig {
  baseUrl: string;
  onUnauthorized: () => void;
  onTokenRefreshed?: (user: any) => void;
  onSmtpNotConfigured?: () => void;
}

const SMTP_NOT_CONFIGURED = 'SMTP is not configured';

export const isSmtpNotConfigured = (err: unknown) =>
  err instanceof Error && err.message === SMTP_NOT_CONFIGURED;

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(baseUrl: string, onRefreshed?: (user: any) => void): Promise<boolean> {
  try {
    const refreshUrl = `${baseUrl}/auth.refresh`;

    const res = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-trpc-source': 'universal-client',
      },
      body: JSON.stringify({ json: {} }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data?.result?.data?.json?.user && onRefreshed) {
      onRefreshed(data.result.data.json.user);
    }
    return true;
  } catch {
    return false;
  }
}

export const createUniversalTrpcClient = (config: TrpcConfig) => {
  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');

  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: cleanBaseUrl,
        headers() {
          return {
            'x-trpc-source': 'universal-client',
          };
        },
        fetch: async (url, options) => {
          const res = await fetch(url, {
            ...options,
            credentials: 'include',
          });

          if (
            res.status === 401 &&
            typeof window !== 'undefined' &&
            !window.location.pathname.includes('/login')
          ) {
            const urlStr = typeof url === 'string' ? url : url.toString();
            if (urlStr.includes('auth.refresh')) {
              config.onUnauthorized();
              return res;
            }

            if (!refreshPromise) {
              refreshPromise = tryRefresh(cleanBaseUrl, config.onTokenRefreshed).finally(() => {
                refreshPromise = null;
              });
            }

            const refreshed = await refreshPromise;
            if (refreshed) {
              return fetch(url, { ...options, credentials: 'include' });
            }

            config.onUnauthorized();
          }

          // 412 for a lone call, 207 when the call shared a batch
          if (config.onSmtpNotConfigured && (res.status === 412 || res.status === 207)) {
            const body = await res.clone().text();
            if (body.includes(SMTP_NOT_CONFIGURED)) config.onSmtpNotConfigured();
          }

          return res;
        },
      }),
    ],
  });
};
