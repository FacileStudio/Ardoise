import { Context } from 'hono';
import { openApiDocument } from '@repo/trpc';

export const openApiHandler = (c: Context) => {
  return c.json(openApiDocument);
};
