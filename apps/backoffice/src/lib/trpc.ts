import { createUniversalTrpcClient } from '@repo/shared';
import { auth } from './stores/auth';
import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export const trpc = createUniversalTrpcClient({
  baseUrl: import.meta.env.VITE_API_URL + '/trpc',
  getToken: () => get(auth).session?.token || null,
  onUnauthorized: () => auth.logout(() => browser && goto('/')),
});
