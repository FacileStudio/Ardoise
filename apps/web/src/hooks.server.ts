import type { Handle, HandleServerError } from '@sveltejs/kit';
import { logger } from '@repo/logger';

export const handle: Handle = async ({ event, resolve }) => {
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
