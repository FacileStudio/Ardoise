import type { PrismaClient } from '@repo/database';
import { s3 } from '../../lib/s3';

export const mediaService = {
  generateUploadUrl: async (userId: string, data: { fileName: string; fileType: string }) => {
    const fileKey = `uploads/${userId}/${Date.now()}-${data.fileName}`;

    const uploadUrl = s3.file(fileKey).presign({
      expiresIn: 900,
      method: 'PUT',
      acl: 'public-read',
    });

    return {
      uploadUrl,
      fileKey,
      publicUrl: `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET_NAME}/${fileKey}`,
    };
  },

  updateUserAvatar: async (
    db: PrismaClient,
    userId: string,
    data: { url: string; key: string; size: number }
  ) => {
    // 1. On cherche l'ancien média pour le supprimer de Minio
    const oldMedia = await db.media.findUnique({ where: { avatarUserId: userId } });
    if (oldMedia) await s3.file(oldMedia.key).delete();

    // 2. Mise à jour ou création
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
    userId: string,
    data: { url: string; key: string; size: number }
  ) => {
    const oldMedia = await db.media.findUnique({ where: { coverUserId: userId } });
    if (oldMedia) await s3.file(oldMedia.key).delete();

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

  removeUserAvatar: async (db: PrismaClient, userId: string) => {
    const media = await db.media.findUnique({
      where: { avatarUserId: userId },
    });

    if (!media) return null;

    await s3.file(media.key).delete();

    return db.media.delete({
      where: { id: media.id },
    });
  },

  removeUserCover: async (db: PrismaClient, userId: string) => {
    const media = await db.media.findUnique({
      where: { coverUserId: userId },
    });

    if (!media) return null;

    await s3.file(media.key).delete();

    return db.media.delete({
      where: { id: media.id },
    });
  },

  deleteAllUserMedia: async (db: PrismaClient, userId: string) => {
    const medias = await db.media.findMany({
      where: { OR: [{ avatarUserId: userId }, { coverUserId: userId }] },
    });

    for (const media of medias) {
      await s3.file(media.key).delete();
    }

    return db.media.deleteMany({
      where: { OR: [{ avatarUserId: userId }, { coverUserId: userId }] },
    });
  },
};

export default mediaService;
