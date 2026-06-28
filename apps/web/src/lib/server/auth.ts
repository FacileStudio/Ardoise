import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@repo/trpc';
import type { SessionUser } from '@repo/auth-shared';

const AUTH_COOKIE = 'auth_token';

export async function fetchSessionUser(
  token: string | undefined,
  apiUrl: string | undefined,
  fetchFn: typeof fetch
): Promise<SessionUser | null> {
  if (!token) return null;

  const base = apiUrl
    ? apiUrl.replace(/\/trpc\/?$/, '').replace(/\/$/, '')
    : '';
  const url = base ? `${base}/trpc` : '/trpc';

  try {
    const client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url,
          fetch: (input, init) =>
            fetchFn(input, {
              ...init,
              headers: {
                ...(init?.headers as Record<string, string> | undefined),
                cookie: `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
                'x-trpc-source': 'web-server-guard',
              },
            }),
        }),
      ],
    });

    const user = await client.auth.me.query({});
    return (user as SessionUser) ?? null;
  } catch {
    return null;
  }
}
