import { createUniversalTrpcClient } from '@repo/trpc-client';
import { smtpNotice } from './smtp-notice.svelte';
import { authStore } from './auth-store';
import env from '../lib/env';

const apiUrl = env.API_URL?.replace(/\/trpc\/?$/, '').replace(/\/$/, '');

export const trpc = createUniversalTrpcClient({
  baseUrl: apiUrl ? `${apiUrl}/trpc` : '/trpc',
  onUnauthorized: () => authStore.logout(),
  onTokenRefreshed: (user) => authStore.updateUser(user),
  onSmtpNotConfigured: () => smtpNotice.show(),
});

export default trpc;
