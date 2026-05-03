import { publicEnvSchema } from '@repo/env';
import { browser, building } from '$app/environment';
import { ZodError } from 'zod';

const isBrowser = browser;
const isBuilding = building;

function getEnv() {
  if (isBrowser || isBuilding) {
    return {
      API_URL: import.meta.env.VITE_API_URL || undefined,
      NODE_ENV: import.meta.env.MODE || 'development',
    };
  }

  return {
    API_URL: process.env.VITE_API_URL || import.meta.env.VITE_API_URL || undefined,
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  };
}

let env: ReturnType<typeof publicEnvSchema.parse>;

try {
  env = publicEnvSchema.parse(getEnv());
} catch (error) {
  console.error('❌ Backoffice environment validation failed:');

  if (error instanceof ZodError) {
    console.error('\nMissing or invalid environment variables:');
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  } else if (error instanceof Error) {
    console.error(error.message);
  }

  console.error('\nSet BACKEND_URL in Docker Compose so VITE_API_URL points at the backend domain.\n');

  throw error;
}

export { env };
export default env;
