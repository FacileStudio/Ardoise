import { Context } from 'hono';

export function resolveVersion(source: Record<string, string | undefined> = process.env): string {
  return source.APP_VERSION?.trim() || 'dev';
}

export function createVersionHandler(version: string = resolveVersion()) {
  return (c: Context) => c.json({ version });
}
