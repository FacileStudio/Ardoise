import { createCacheMiddleware } from 'trpc-redis-cache';

export interface GlobalCacheOptions {
  ttl?: number;
  useUpstash?: boolean;
  globalCache: boolean;
  userSpecific: boolean;
  debug: boolean;
}

export const globalCacheFactory = (config: GlobalCacheOptions) => createCacheMiddleware(config);

export default globalCacheFactory;
