import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  return await resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
  console.error('Server error:', error);
  console.error('Event:', {
    url: event.url.toString(),
    route: event.route?.id,
    method: event.request.method,
  });

  return {
    message: 'Internal server error',
    errorId: crypto.randomUUID(),
  };
};
