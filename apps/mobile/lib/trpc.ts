import { createUniversalTrpcClient } from '@repo/trpc-client';
import type { AuthState } from '@repo/auth-shared';
import { authStore } from './auth-store';
import env from './env';

const getSnapshot = (): AuthState => {
  let state: any;
  const unsub = authStore.subscribe((s) => (state = s));
  unsub();
  return state as AuthState;
};

export const trpc = createUniversalTrpcClient({
  baseUrl: env.API_URL + '/trpc',

  getToken: () => getSnapshot().session?.token || null,

  onUnauthorized: () => {
    authStore.logout();
  },
});
