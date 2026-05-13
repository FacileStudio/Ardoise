import type { Context, Next } from "hono";
import { getConnInfo } from "hono/bun";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
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
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    entry.count++;
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

const limiter = new RateLimiter();

function getClientIp(c: Context): string {
  try {
    const connInfo = getConnInfo(c);
    if (connInfo?.remote?.address) {
      return connInfo.remote.address;
    }
  } catch {}
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    if (c.req.method === "OPTIONS") {
      await next();
      return;
    }

    const ip = getClientIp(c);
    const path = new URL(c.req.url).pathname;
    const key = `${ip}:${path}`;

    const result = limiter.check(key, config);

    c.header("X-RateLimit-Limit", String(config.maxRequests));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests" }, 429);
    }

    await next();
  };
}

export const authRateLimit = createRateLimitMiddleware({
  windowMs: 60_000,
  maxRequests: 5,
});

export const paymentRateLimit = createRateLimitMiddleware({
  windowMs: 60_000,
  maxRequests: 20,
});

export const generalRateLimit = createRateLimitMiddleware({
  windowMs: 60_000,
  maxRequests: 100,
});
