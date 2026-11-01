import { error, redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { logger } from '@repo/logger';
import { isAdmin, type SessionUser } from '@repo/auth-shared';
import { fetchSessionUser } from '$lib/server/auth';
import env from '$lib/env';
import { redactUrl } from '$lib/server/redact';

const AUTH_COOKIE = 'auth_token';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;

  if (event.url.pathname.startsWith('/admin')) {
    const token = event.cookies.get(AUTH_COOKIE);
    let user: SessionUser | null;
    try {
      user = await fetchSessionUser(token, env.API_URL, event.fetch);
    } catch (err) {
      logger.warn({ err }, 'Session check failed, not signing out');
      error(503, 'Service temporairement indisponible');
    }
    event.locals.user = user;

    if (!user) {
      const next = encodeURIComponent(event.url.pathname + event.url.search);
      throw redirect(303, `/login?next=${next}`);
    }
    if (!isAdmin(user)) {
      throw redirect(303, '/app');
    }
  }

  const response = await resolve(event);
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
