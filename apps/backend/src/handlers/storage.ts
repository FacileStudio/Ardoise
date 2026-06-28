import type { AuthManager } from '@repo/auth';
import type { StorageService } from '@repo/storage';
import { verifyStorageTicket } from '@repo/storage';
import type { ServerEnv } from '@repo/env';
import type { Context } from 'hono';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

interface StorageHandlerOptions {
  authManager: AuthManager;
  storage: StorageService;
  env: ServerEnv;
}

function getStorageKey(c: Context): string {
  return c.req.path.replace(/^\/storage\/?/, '').replace(/^\/+/, '');
}

export function createStorageUploadHandler({ storage, env }: StorageHandlerOptions) {
  return async (c: Context) => {
    const key = getStorageKey(c);
    const ticket = c.req.query('ticket');

    if (!verifyStorageTicket(env.ENCRYPTION_SECRET, ticket, { method: 'PUT', key })) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.arrayBuffer();

    if (body.byteLength > MAX_UPLOAD_BYTES) {
      return c.json({ error: 'File too large' }, 413);
    }

    const contentType = c.req.header('content-type') || undefined;

    await storage.upload(key, body, contentType);
    return c.json({ key, url: `/storage/${key}` });
  };
}

export function createStorageDownloadHandler({ storage, env }: StorageHandlerOptions) {
  return async (c: Context) => {
    const key = getStorageKey(c);
    const ticket = c.req.query('ticket');

    if (!verifyStorageTicket(env.ENCRYPTION_SECRET, ticket, { method: 'GET', key })) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const data = await storage.download(key);
    const body = new Uint8Array(data);
    return new Response(body.buffer, {
      headers: {
        'content-type': 'application/octet-stream',
        'cache-control': 'private, max-age=300',
      },
    });
  };
}
