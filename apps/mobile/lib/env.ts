import { publicEnvSchema } from '@repo/env';

export const env = publicEnvSchema.parse({
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  STRIPE_PRICE_ID: process.env.EXPO_PUBLIC_STRIPE_PRICE_ID,
  NODE_ENV: process.env.NODE_ENV || 'development',
});

export default env;
