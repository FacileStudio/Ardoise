import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { logger } from '@repo/logger';
import { isAdmin } from '@repo/auth-shared';
import { fetchSessionUser } from '$lib/server/auth';
import env from '$lib/env';

const AUTH_COOKIE = 'auth_token';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;

  if (event.url.pathname.startsWith('/admin')) {
    const token = event.cookies.get(AUTH_COOKIE);
    const user = await fetchSessionUser(token, env.API_URL, event.fetch);
    event.locals.user = user;

    if (!user) {
      throw redirect(303, '/login');
    }
    if (!isAdmin(user)) {
      throw redirect(303, '/app');
    }
  }

  return await resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
  logger.error(
    { err: error, url: event.url.toString(), route: event.route?.id, method: event.request.method },
    'Unhandled server error'
  );

  return {
    message: 'Internal server error',
    errorId: crypto.randomUUID(),
  };
};
