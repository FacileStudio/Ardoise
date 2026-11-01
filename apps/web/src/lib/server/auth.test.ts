import { describe, expect, it } from 'bun:test';
import { refreshSessionUser } from './auth';

const user = { id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', role: 'ADMIN' };

describe('refreshSessionUser', () => {
  it('returns null without a refresh token', async () => {
    const fetchFn = (() => {
      throw new Error('must not call');
    }) as unknown as typeof fetch;
    expect(await refreshSessionUser(undefined, 'https://api.test', fetchFn)).toBeNull();
  });

  it('returns the user and the rotated cookies', async () => {
    const seen: { url?: string; cookie?: string } = {};
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen.url = url;
      seen.cookie = (init.headers as Record<string, string>).cookie;
      const headers = new Headers();
      headers.append('set-cookie', 'auth_token=a; Path=/');
      headers.append('set-cookie', 'refresh_token=r; Path=/');
      return new Response(JSON.stringify({ result: { data: { user } } }), { headers });
    }) as unknown as typeof fetch;
    const out = await refreshSessionUser('old', 'https://api.test/trpc', fetchFn);
    expect(out?.user.id).toBe('u1');
    expect(out?.setCookies).toHaveLength(2);
    expect(seen).toEqual({ url: 'https://api.test/trpc/auth.refresh', cookie: 'refresh_token=old' });
  });

  it('returns null on 401 and throws on server errors', async () => {
    const mk = (status: number) => (async () => new Response('{}', { status })) as unknown as typeof fetch;
    expect(await refreshSessionUser('x', 'https://api.test', mk(401))).toBeNull();
    await expect(refreshSessionUser('x', 'https://api.test', mk(502))).rejects.toThrow();
  });
});
