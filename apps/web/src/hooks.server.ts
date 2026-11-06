import { error, redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { logger } from '@repo/logger';
import { isMember, type SessionUser } from '@repo/auth-shared';
import { fetchSessionUser, refreshSessionUser } from '$lib/server/auth';
import env from '$lib/env';
import { redactUrl } from '$lib/server/redact';

const AUTH_COOKIE = 'auth_token';
const REFRESH_COOKIE = 'refresh_token';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  let refreshedCookies: string[] = [];

  if (event.url.pathname.startsWith('/admin')) {
    const token = event.cookies.get(AUTH_COOKIE);
    let user: SessionUser | null;
    try {
      user = await fetchSessionUser(token, env.API_URL, event.fetch);
      if (!user) {
        const refreshed = await refreshSessionUser(
          event.cookies.get(REFRESH_COOKIE),
          env.API_URL,
          event.fetch
        );
        if (refreshed) {
          user = refreshed.user;
          refreshedCookies = refreshed.setCookies;
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Session check failed, not signing out');
      error(503, 'Service temporairement indisponible');
    }
    event.locals.user = user;

    if (!user) {
      const next = encodeURIComponent(event.url.pathname + event.url.search);
      throw redirect(303, `/login?next=${next}`);
    }
    if (!isMember(user)) {
      throw redirect(303, '/app');
    }
  }

  const response = await resolve(event);
  for (const value of refreshedCookies) response.headers.append('set-cookie', value);
  if (event.url.pathname.startsWith('/login/verify')) {
    response.headers.set('Referrer-Policy', 'no-referrer');
  }
  return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
  logger.error(
    { err: error, url: redactUrl(event.url.toString()), route: event.route?.id, method: event.request.method },
    'Unhandled server error'
  );

  return {
    message: 'Internal server error',
    errorId: crypto.randomUUID(),
  };
};
