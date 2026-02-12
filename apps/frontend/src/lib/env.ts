import { publicEnvSchema } from '@repo/env';

export const env = publicEnvSchema.parse({
  API_URL: import.meta.env.VITE_API_URL,
  STRIPE_PUBLISHABLE_KEY: import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NODE_ENV: import.meta.env.MODE || 'development',
});

export default env;
