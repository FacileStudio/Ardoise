import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL?.replace('/trpc', '') || 'http://localhost:3001',
});

export type AuthClient = typeof authClient;
