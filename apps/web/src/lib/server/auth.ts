import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client';
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
  } catch (error) {
    if (isUnauthorized(error)) return null;
    throw error;
  }
}

export function isUnauthorized(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const data = error.data as { httpStatus?: number; code?: string } | undefined;
  return data?.httpStatus === 401 || data?.code === 'UNAUTHORIZED';
}

const REFRESH_COOKIE = 'refresh_token';

export interface RefreshedSession {
  user: SessionUser;
  setCookies: string[];
}

export async function refreshSessionUser(
  refreshToken: string | undefined,
  apiUrl: string | undefined,
  fetchFn: typeof fetch
): Promise<RefreshedSession | null> {
  if (!refreshToken) return null;

  const base = apiUrl ? apiUrl.replace(/\/trpc\/?$/, '').replace(/\/$/, '') : '';
  const res = await fetchFn(`${base}/trpc/auth.refresh`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}`,
      'x-trpc-source': 'web-server-guard',
    },
    body: JSON.stringify({ json: {} }),
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Session refresh failed with status ${res.status}`);

  const data = (await res.json()) as { result?: { data?: { json?: { user?: SessionUser } } } };
  const user = data.result?.data?.json?.user;
  if (!user) return null;
  return { user, setCookies: res.headers.getSetCookie() };
}
