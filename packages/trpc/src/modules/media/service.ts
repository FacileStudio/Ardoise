import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import { createStorageTicket } from '@repo/storage';
import { requireRowScope } from '../space/service';

const NOT_ENTITLED = 'File not found';

export function safeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  const clean = base.replace(/[^\w.-]+/g, '_').replace(/^\.+/, '');
  return clean.slice(-100) || 'file';
}

function assertOwnedKey(userId: string, data: { url: string; key: string }) {
  const prefix = `uploads/${userId}/`;
  const segments = data.key.split('/');
  if (!data.key.startsWith(prefix) || segments.includes('..') || segments.includes('.')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid file key' });
  }
  if (parseStorageKey(data.url) !== data.key) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The URL does not match the file key' });
  }
}

export function parseStorageKey(value: string | null): string | null {
  if (!value) return null;

  const path = /^https?:\/\//.test(value) ? new URL(value).pathname : value;
  const parts = path.split('/').filter(Boolean);
  if (parts.includes('..')) return null;

  const storageIndex = parts.indexOf('storage');
  const uploadsIndex = parts.indexOf('uploads');
  const segments =
    storageIndex !== -1
      ? parts.slice(storageIndex + 1)
      : uploadsIndex !== -1
        ? parts.slice(uploadsIndex)
        : [];

  return segments.length > 0 ? segments.join('/') : null;
}

/**
 * Who may read a stored file. A document PDF is checked first and always
 * needs its space, so no other reference to the same key can unlock it. A
 * provider logo needs the provider's space; a shared provider's logo needs a
 * platform studio membership.
 */
async function findKeyReference(
  db: PrismaClient,
  key: string
): Promise<{ spaceId: string } | 'public' | 'shared' | null> {
  const documents = await db.document.findMany({
    where: { pdfUrl: { endsWith: key } },
    select: { spaceId: true, pdfUrl: true },
  });
  const document = documents.find((row) => parseStorageKey(row.pdfUrl) === key);
  if (document) return { spaceId: document.spaceId };

  const settings = await db.settings.findFirst({ select: { logoUrl: true } });
  if (settings && parseStorageKey(settings.logoUrl) === key) return 'public';

  const providers = await db.provider.findMany({
    where: { logoUrl: { endsWith: key } },
    select: { logoUrl: true, spaceId: true },
  });
  const provider = providers.find((row) => parseStorageKey(row.logoUrl) === key);
  if (provider) return provider.spaceId ? { spaceId: provider.spaceId } : 'shared';

  return null;
}

export const mediaService = {
  generateUploadUrl: async (
    userId: string,
    data: { fileName: string; fileType: string },
    appOrigin: string,
    secret: string
  ) => {
    const fileKey = `uploads/${userId}/${Date.now()}-${safeFileName(data.fileName)}`;
    const baseUrl = appOrigin.replace(/\/$/, '');
    const ticket = createStorageTicket(secret, { method: 'PUT', key: fileKey }, 900);

    return {
      uploadUrl: `${baseUrl}/storage/${fileKey}?ticket=${ticket}`,
      fileKey,
      publicUrl: `${baseUrl}/storage/${fileKey}`,
    };
  },

  resolveDownloadKey: async (db: PrismaClient, userId: string, url: string): Promise<string> => {
    const key = parseStorageKey(url);

    if (!key) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid file URL: storage path not found',
      });
    }

    if (key.startsWith(`uploads/${userId}/`)) return key;

    const reference = await findKeyReference(db, key);

    if (reference === null) {
      throw new TRPCError({ code: 'NOT_FOUND', message: NOT_ENTITLED });
    }

    if (reference === 'shared') {
      const studio = await db.spaceMember.findFirst({
        where: { userId, space: { platformStudio: true } },
        select: { id: true },
      });
      if (!studio) throw new TRPCError({ code: 'NOT_FOUND', message: NOT_ENTITLED });
    } else if (reference !== 'public') {
      await requireRowScope(db, userId, reference, NOT_ENTITLED);
    }

    return key;
  },

  generateDownloadUrl: (key: string, appOrigin: string, secret: string) => {
    const baseUrl = appOrigin.replace(/\/$/, '');
    const ticket = createStorageTicket(secret, { method: 'GET', key }, 3600);
    return `${baseUrl}/storage/${key}?ticket=${ticket}`;
  },

  updateUserAvatar: async (
    db: PrismaClient,
    storage: StorageService,
    userId: string,
    data: { url: string; key: string; size: number }
  ) => {
    assertOwnedKey(userId, data);
    const oldMedia = await db.media.findUnique({ where: { avatarUserId: userId } });
    if (oldMedia && oldMedia.key !== data.key) await storage.delete(oldMedia.key);

    return db.media.upsert({
      where: { avatarUserId: userId },
      create: {
        url: data.url,
        key: data.key,
        mimeType: 'image/jpeg',
        size: data.size,
        avatarUserId: userId,
      },
      update: {
        url: data.url,
        key: data.key,
        size: data.size,
      },
    });
  },

  updateUserCover: async (
    db: PrismaClient,
    storage: StorageService,
    userId: string,
    data: { url: string; key: string; size: number }
  ) => {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    assertOwnedKey(userId, data);
    const oldMedia = await db.media.findUnique({ where: { coverUserId: userId } });
    if (oldMedia && oldMedia.key !== data.key) await storage.delete(oldMedia.key);

    return db.media.upsert({
      where: { coverUserId: userId },
      create: {
        url: data.url,
        key: data.key,
        mimeType: 'image/jpeg',
        size: data.size,
        coverUserId: userId,
      },
      update: {
        url: data.url,
        key: data.key,
        size: data.size,
      },
    });
  },

  removeUserAvatar: async (db: PrismaClient, storage: StorageService, userId: string) => {
    const media = await db.media.findUnique({ where: { avatarUserId: userId } });
    if (!media) return null;

    await storage.delete(media.key);
    return db.media.delete({ where: { id: media.id } });
  },

  removeUserCover: async (db: PrismaClient, storage: StorageService, userId: string) => {
    const media = await db.media.findUnique({ where: { coverUserId: userId } });
    if (!media) return null;

    await storage.delete(media.key);
    return db.media.delete({ where: { id: media.id } });
  },

  deleteAllUserMedia: async (db: PrismaClient, storage: StorageService, userId: string) => {
    const medias = await db.media.findMany({
      where: { OR: [{ avatarUserId: userId }, { coverUserId: userId }] },
    });

    for (const media of medias) {
      await storage.delete(media.key);
    }

    return db.media.deleteMany({
      where: { OR: [{ avatarUserId: userId }, { coverUserId: userId }] },
    });
  },
};

export default mediaService;
