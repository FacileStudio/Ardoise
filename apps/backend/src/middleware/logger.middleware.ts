import type { Context, Next } from "hono";
import { logger } from "@/lib/logger";

const SECRET_PARAMS = ['ticket', 'code', 'state', 'token'];

export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const name of SECRET_PARAMS) {
      if (url.searchParams.has(name)) url.searchParams.set(name, '[redacted]');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const loggerMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  const { method } = c.req;
  const url = redactUrl(c.req.url);

  const requestId = c.get('requestId') || crypto.randomUUID();
  c.set('requestId', requestId);

  const requestLogger = logger.child({ requestId });
  c.set('logger', requestLogger);

  requestLogger.info({
    type: "request",
    method,
    url,
  });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  const logData = {
    type: "response",
    method,
    url,
    status,
    duration: `${duration}ms`,
  };

  if (status >= 500) {
    requestLogger.error(logData);
  } else if (status >= 400) {
    requestLogger.warn(logData);
  } else {
    requestLogger.info(logData);
  }
};
