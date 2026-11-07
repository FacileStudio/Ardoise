import { readFileSync } from 'node:fs';
import { Context } from 'hono';

const ROOT_PACKAGE = new URL('../../../../package.json', import.meta.url);

export function resolveVersion(path: URL = ROOT_PACKAGE): string {
  return (JSON.parse(readFileSync(path, 'utf8')) as { version: string }).version;
}

export function createVersionHandler(version: string = resolveVersion()) {
  return (c: Context) => c.json({ version });
}
