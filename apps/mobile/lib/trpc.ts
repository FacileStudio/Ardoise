import { createUniversalTrpcClient } from '@repo/shared';
import { auth } from './auth-store';
import { router } from 'expo-router';

const getSnapshot = () => {
  let state: any;
  const unsub = auth.subscribe((s) => (state = s));
  unsub();
  return state;
};

export const trpc = createUniversalTrpcClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL + '/trpc',
  getToken: () => getSnapshot()?.session?.token || null,
  onUnauthorized: () => {
    auth.logout(() => router.replace('/login'));
  },
});
