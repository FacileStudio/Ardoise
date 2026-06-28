import { cors } from 'hono/cors';

const corsHandler = (allowedOrigins: string[]) => {
  const allowLocal = process.env.NODE_ENV !== 'production';

  return cors({
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
};

export default corsHandler;
