import { createUniversalTrpcClient } from '@repo/trpc-client';
import { authStore } from './auth-store';
import { get } from 'svelte/store';
import env from '../lib/env';

const apiUrl = env.API_URL?.replace(/\/trpc\/?$/, '');

export const trpc = createUniversalTrpcClient({
  baseUrl: apiUrl ? `${apiUrl}/trpc` : '/trpc',

  getToken: () => {
    const state = get(authStore);
    return state.session?.token || null;
  },
  onUnauthorized: () => authStore.logout(),
});

export default trpc;
