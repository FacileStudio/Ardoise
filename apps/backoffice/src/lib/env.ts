import { publicEnvSchema } from '@repo/env';

export const env = publicEnvSchema.parse({
  API_URL: import.meta.env.VITE_API_URL,
  STRIPE_PRICE_ID: undefined,
  NODE_ENV: import.meta.env.MODE,
});

export default env;
