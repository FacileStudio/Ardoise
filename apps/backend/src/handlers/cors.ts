import { cors } from 'hono/cors';

const corsHandler = (allowedOrigins: string[]) =>
  cors({
    origin: (origin) => {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://192.168')) {
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

export default corsHandler;
