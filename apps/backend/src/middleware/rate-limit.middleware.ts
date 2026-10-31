import type { Context, Next } from 'hono';
import { getConnInfo } from 'hono/bun';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
    setInterval(() => this.cleanup(), 60_000).unref();
  }

  check(
    key: string,
    config: RateLimitConfig,
    cost = 1
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      if (!this.store.has(key) && this.store.size >= this.maxEntries) {
        const oldest = this.store.keys().next().value;
        if (oldest !== undefined) {
          this.store.delete(oldest);
        }
      }
      const resetAt = now + config.windowMs;
      this.store.set(key, { count: cost, resetAt });
      return {
        allowed: cost <= config.maxRequests,
        remaining: Math.max(0, config.maxRequests - cost),
        resetAt,
      };
    }

    entry.count += cost;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    return { allowed: entry.count <= config.maxRequests, remaining, resetAt: entry.resetAt };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

function getClientIp(c: Context): string {
  try {
    const connInfo = getConnInfo(c);
    if (connInfo?.remote?.address) {
      return connInfo.remote.address;
    }
  } catch {
    /* getConnInfo is unavailable outside a Bun server */
  }
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

const BUCKETS = {
  auth: { windowMs: 60_000, maxRequests: 5 },
  payment: { windowMs: 60_000, maxRequests: 20 },
  general: { windowMs: 60_000, maxRequests: 300 },
} satisfies Record<string, RateLimitConfig>;

type Bucket = keyof typeof BUCKETS;

/**
 * A tRPC batch call puts several procedures in one path (`/trpc/a.x,b.y`), so a
 * limiter keyed on the path alone lets one request carry unlimited login
 * attempts. Each procedure counts against its own bucket instead.
 */
export function bucketCosts(path: string): Map<Bucket, number> {
  const costs = new Map<Bucket, number>();
  const procedures = path.replace(/^\/trpc\/?/, '').split(',').filter(Boolean);

  for (const procedure of procedures.length > 0 ? procedures : ['']) {
    const bucket: Bucket = procedure.startsWith('auth.')
      ? 'auth'
      : procedure.startsWith('payment.')
        ? 'payment'
        : 'general';
    costs.set(bucket, (costs.get(bucket) ?? 0) + 1);
  }
  return costs;
}

export function createTrpcRateLimit(limiter = new RateLimiter()) {
  return async (c: Context, next: Next) => {
    if (c.req.method === 'OPTIONS') {
      await next();
      return;
    }

    const ip = getClientIp(c);
    let blocked: { config: RateLimitConfig; resetAt: number } | null = null;
    let headerResult: { config: RateLimitConfig; remaining: number; resetAt: number } | null = null;

    for (const [bucket, cost] of bucketCosts(new URL(c.req.url).pathname)) {
      const config = BUCKETS[bucket];
      const result = limiter.check(`${ip}:${bucket}`, config, cost);
      if (!result.allowed) {
        blocked ??= { config, resetAt: result.resetAt };
      }
      if (!headerResult || result.remaining < headerResult.remaining) {
        headerResult = { config, remaining: result.remaining, resetAt: result.resetAt };
      }
    }

    if (headerResult) {
      c.header('X-RateLimit-Limit', String(headerResult.config.maxRequests));
      c.header('X-RateLimit-Remaining', String(headerResult.remaining));
      c.header('X-RateLimit-Reset', String(Math.ceil(headerResult.resetAt / 1000)));
    }

    if (blocked) {
      c.header('Retry-After', String(Math.ceil((blocked.resetAt - Date.now()) / 1000)));
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();
  };
}

export const trpcRateLimit = createTrpcRateLimit();
