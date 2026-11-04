import { redirect, type ServerLoad } from '@sveltejs/kit';
import { fetchBillingStaff } from '$lib/server/auth';
import env from '$lib/env';

export const load: ServerLoad = async ({ cookies, fetch }) => {
  if (!(await fetchBillingStaff(cookies.get('auth_token'), env.API_URL, fetch))) {
    throw redirect(303, '/admin');
  }
  return {};
};
