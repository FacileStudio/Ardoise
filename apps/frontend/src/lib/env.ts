import process from 'node:process';
import { publicEnvSchema } from '@repo/env';
import { browser, building } from '$app/environment';
import { ZodError } from 'zod';

const isBrowser = browser;
const isBuilding = building;

function getEnv() {
  if (isBrowser || isBuilding) {
    return {
      API_URL: import.meta.env.VITE_API_URL,
      STRIPE_PUBLISHABLE_KEY: import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NODE_ENV: import.meta.env.MODE || 'development',
    };
  }

  return {
    API_URL: process.env.VITE_API_URL || import.meta.env.VITE_API_URL || '',
    STRIPE_PUBLISHABLE_KEY: process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  };
}

let env: ReturnType<typeof publicEnvSchema.parse>;

try {
  env = publicEnvSchema.parse(getEnv());
} catch (error) {
  console.error('❌ Frontend environment validation failed:');

  if (error instanceof ZodError) {
    console.error('\nMissing or invalid environment variables:');
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else if (error instanceof Error) {
    console.error(error.message);
  }

  console.error('\nRequired environment variables:');
  console.error('  - VITE_API_URL: Backend API URL');
  console.error('  - PUBLIC_STRIPE_PUBLISHABLE_KEY: Stripe publishable key (optional)');
  console.error('\nThese must be set as build arguments in Railway.\n');

  throw error;
}

export { env };
export default env;
