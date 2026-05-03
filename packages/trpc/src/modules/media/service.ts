import type { PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import { createStorageTicket } from '@repo/storage';

export const mediaService = {
  generateUploadUrl: async (
    userId: string,
    data: { fileName: string; fileType: string },
    appOrigin: string,
    secret: string
  ) => {
    const fileKey = `uploads/${userId}/${Date.now()}-${data.fileName}`;
    const baseUrl = appOrigin.replace(/\/$/, '');
    const ticket = createStorageTicket(secret, { method: 'PUT', key: fileKey }, 900);

    return {
      uploadUrl: `${baseUrl}/storage/${fileKey}?ticket=${ticket}`,
      fileKey,
      publicUrl: `${baseUrl}/storage/${fileKey}`,
    };
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
    const oldMedia = await db.media.findUnique({ where: { avatarUserId: userId } });
    if (oldMedia) await storage.delete(oldMedia.key);

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
      throw new Error(`User with ID ${userId} not found.`); // Or a more specific tRPC error
    }

    const oldMedia = await db.media.findUnique({ where: { coverUserId: userId } });
    if (oldMedia) await storage.delete(oldMedia.key);

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
