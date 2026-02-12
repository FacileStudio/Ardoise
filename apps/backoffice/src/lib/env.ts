import { publicEnvSchema } from '@repo/env';
import { browser, building } from '$app/environment';

const isBrowser = browser;
const isBuilding = building;

function getEnv() {
  if (isBrowser || isBuilding) {
    return {
      API_URL: import.meta.env.VITE_API_URL,
      NODE_ENV: import.meta.env.MODE || 'development',
    };
  }

  return {
    API_URL: process.env.VITE_API_URL || '',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  };
}

export const env = publicEnvSchema.parse(getEnv());

export default env;
