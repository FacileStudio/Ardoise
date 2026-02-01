import { createAuthClient } from 'better-auth/client';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import type { Auth } from '@repo/trpc';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  plugins: [inferAdditionalFields<Auth>()],
});

export type AuthClient = typeof authClient;
