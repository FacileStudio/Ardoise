import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';

/** Paths that never get the app's credentialed CORS: the billing API sets its own (catalog) or none. */
export const isBillingPath = (path: string) => path === '/api/catalog' || path === '/billing' || path.startsWith('/billing/');

const corsHandler = (allowedOrigins: string[]) => {
  const allowLocal = process.env.NODE_ENV !== 'production';

  const handler = cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (
        allowLocal &&
        (origin.startsWith('http://localhost') || origin.startsWith('http://192.168'))
      ) {
        return origin;
      }
      for (const allowed of allowedOrigins) {
        if (origin === allowed) return origin;
      }
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
  });
  return (c: Context, next: Next) => (isBillingPath(c.req.path) ? next() : handler(c, next));
};

export default corsHandler;
