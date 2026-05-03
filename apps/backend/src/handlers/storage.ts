import type { AuthManager } from '@repo/auth';
import type { StorageService } from '@repo/storage';
import { verifyStorageTicket } from '@repo/storage';
import type { ServerEnv } from '@repo/env';
import type { Context } from 'hono';

interface StorageHandlerOptions {
  authManager: AuthManager;
  storage: StorageService;
  env: ServerEnv;
}

function getStorageKey(c: Context): string {
  return c.req.path.replace(/^\/storage\/?/, '').replace(/^\/+/, '');
}

async function requireUser(c: Context, authManager: AuthManager) {
  const authHeader = c.req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  return token ? await authManager.verifyToken(token) : null;
}

export function createStorageUploadHandler({ authManager, storage, env }: StorageHandlerOptions) {
  return async (c: Context) => {
    const key = getStorageKey(c);
    const ticket = c.req.query('ticket');
    const user = await requireUser(c, authManager);
    const hasValidTicket = verifyStorageTicket(env.ENCRYPTION_SECRET, ticket, {
      method: 'PUT',
      key,
    });

    if (!user && !hasValidTicket) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.arrayBuffer();
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
