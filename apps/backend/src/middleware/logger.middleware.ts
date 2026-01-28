import type { Context, Next } from "hono";
import { logger } from "@/lib/logger";

export const loggerMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  const { method, url } = c.req;

  logger.info({
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
    logger.error(logData);
  } else if (status >= 400) {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
};
