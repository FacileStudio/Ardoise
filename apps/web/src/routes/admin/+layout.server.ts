import { redirect, type ServerLoad } from '@sveltejs/kit';
import { isAdmin } from '@repo/auth-shared';

export const load: ServerLoad = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    throw redirect(303, '/login');
  }
  if (!isAdmin(user)) {
    throw redirect(303, '/app');
  }

  return { user };
};
