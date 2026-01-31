import { createAuthClient } from 'better-auth/client';
import { EXPO_PUBLIC_API_URL } from '@/constants/Config';

export const authClient = createAuthClient({
  baseURL: EXPO_PUBLIC_API_URL.replace('/trpc', ''),
});

export type AuthClient = typeof authClient;
