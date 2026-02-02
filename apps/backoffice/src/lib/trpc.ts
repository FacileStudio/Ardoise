import { createUniversalTrpcClient } from '@repo/shared';
import { authStore } from './auth-store';
import { get } from 'svelte/store';
import env from '../lib/env';

export const trpc = createUniversalTrpcClient({
  baseUrl: `${env.API_URL}/trpc`,

  getToken: () => {
    const state = get(authStore);
    return state.session?.token || null;
  },
  onUnauthorized: () => authStore.logout(),
});

export default trpc;
