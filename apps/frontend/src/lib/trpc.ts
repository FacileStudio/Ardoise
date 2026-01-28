import { createClient } from '@repo/trpc/client';
import { getToken } from './stores/auth';

export const trpc = createClient(
  import.meta.env.VITE_API_URL || 'http://localhost:3001/trpc',
  getToken
);
