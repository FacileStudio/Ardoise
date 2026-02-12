import type { PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import type { UpdateSettingsInput } from './types';
import { TRPCError } from '@trpc/server';

const SETTINGS_ID = 'global';
const LOGO_KEY = 'settings/logo.png';

export async function getSettings(db: PrismaClient) {
  let settings = await db.settings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) {
    settings = await db.settings.create({
      data: { id: SETTINGS_ID },
    });
  }

  return settings;
}

export async function updateSettings(
  db: PrismaClient,
  data: UpdateSettingsInput
) {
  const settings = await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      ...data,
    },
    update: data,
  });

  return settings;
}

export async function requestLogoUpload(storage: StorageService) {
  try {
    const presignedUrl = await storage.client.file(LOGO_KEY).presign({
      expiresIn: 900,
      method: 'PUT',
    });

    return {
      uploadUrl: presignedUrl,
      publicUrl: storage.getFileUrl(LOGO_KEY),
      logoKey: LOGO_KEY,
    };
  } catch (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to generate upload URL',
      cause: error,
    });
  }
}

export async function confirmLogoUpload(db: PrismaClient, logoUrl: string) {
  const settings = await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      logoUrl,
    },
    update: {
      logoUrl,
    },
  });

  return settings;
}
