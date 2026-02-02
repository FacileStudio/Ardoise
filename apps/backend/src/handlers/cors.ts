import { cors } from 'hono/cors';

const corsHandler = (trustedOrigins: string[]) =>
  cors({
    origin: (origin) => {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://192.168')) {
        return origin;
      }
      for (const trusted of trustedOrigins) {
        if (origin === trusted || origin?.startsWith(trusted)) return origin;
      }
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
  });

export default corsHandler;
