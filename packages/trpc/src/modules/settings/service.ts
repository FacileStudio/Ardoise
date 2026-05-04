import type { PrismaClient, Prisma } from '@repo/database';
import type { StorageService } from '@repo/storage';
import { createStorageTicket } from '@repo/storage';
import { StripeService } from '@repo/stripe';
import { SMTPClient } from '@repo/smtp';
import type { UpdateSettingsInput } from './types';
import { TRPCError } from '@trpc/server';
import { DocuSealService } from '../docuseal/service';
import { join } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const SETTINGS_ID = 'global';
const LOGO_KEY = 'settings/logo.png';

export const secretFields = [
  'stripeSecretKey',
  'stripeWebhookSecret',
  'smtpPass',
  'docusealApiKey',
  'webhookSecret',
] as const;

export function redactSecrets<T extends Record<string, unknown>>(settings: T) {
  const result = { ...settings } as Record<string, unknown>;

  for (const field of secretFields) {
    if (result[field]) {
      result[field] = '';
    }
  }

  return result;
}

function publicSettings<T extends Record<string, unknown>>(settings: T) {
  const safeSettings = { ...settings };
  delete safeSettings.stripeSecretKey;
  delete safeSettings.stripeWebhookSecret;
  delete safeSettings.smtpHost;
  delete safeSettings.smtpPort;
  delete safeSettings.smtpUser;
  delete safeSettings.smtpPass;
  delete safeSettings.smtpFrom;
  delete safeSettings.docusealApiUrl;
  delete safeSettings.docusealApiKey;
  delete safeSettings.webhookUrl;
  delete safeSettings.webhookSecret;
  delete safeSettings.webhookEvents;
  return safeSettings;
}

export async function getSettingsRecord(db: PrismaClient) {
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

export async function getSettings(db: PrismaClient) {
  return publicSettings(await getSettingsRecord(db));
}

export async function getAdminSettings(db: PrismaClient) {
  return redactSecrets(await getSettingsRecord(db));
}

export async function updateSettings(
  db: PrismaClient,
  data: UpdateSettingsInput
) {
  const normalizedEntries = Object.entries(data)
    .filter(([key, value]) => !secretFields.includes(key as (typeof secretFields)[number]) || value !== '')
    .map(([key, value]) => [key, value === '' ? null : value]);
  const normalizedData = Object.fromEntries(normalizedEntries) as Prisma.SettingsUpdateInput;
  const createData = {
    ...normalizedData,
    id: SETTINGS_ID,
  } as Prisma.SettingsCreateInput;

  const settings = await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: createData,
    update: normalizedData,
  });

  return redactSecrets(settings);
}

export async function requestLogoUpload(
  storage: StorageService,
  apiOrigin: string,
  secret: string
) {
  try {
    const baseUrl = apiOrigin.replace(/\/$/, '');
    const ticket = createStorageTicket(secret, { method: 'PUT', key: LOGO_KEY }, 900);

    return {
      uploadUrl: `${baseUrl}/storage/${LOGO_KEY}?ticket=${ticket}`,
      publicUrl: `${baseUrl}/storage/${LOGO_KEY}`,
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

export async function getDocuSealService(db: PrismaClient) {
  const settings = await getSettingsRecord(db);
  const config = settings as unknown as Record<string, unknown>;

  return new DocuSealService(
    typeof config.docusealApiUrl === 'string' ? config.docusealApiUrl : undefined,
    typeof config.docusealApiKey === 'string' ? config.docusealApiKey : undefined
  );
}

export async function getStripeService(db: PrismaClient) {
  const settings = await getSettingsRecord(db);
  const config = settings as unknown as Record<string, unknown>;

  if (typeof config.stripeSecretKey !== 'string' || typeof config.stripeWebhookSecret !== 'string') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Stripe is not configured',
    });
  }

  return new StripeService({
    apiKey: config.stripeSecretKey,
    webhookSecret: config.stripeWebhookSecret,
  });
}

export async function getSmtpClient(db: PrismaClient) {
  const settings = await getSettingsRecord(db);
  const config = settings as unknown as Record<string, unknown>;

  if (
    typeof config.smtpHost !== 'string' ||
    typeof config.smtpPort !== 'number' ||
    typeof config.smtpUser !== 'string' ||
    typeof config.smtpPass !== 'string' ||
    typeof config.smtpFrom !== 'string'
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'SMTP is not configured',
    });
  }

  return new SMTPClient({
    host: config.smtpHost,
    port: config.smtpPort,
    user: config.smtpUser,
    pass: config.smtpPass,
    from: config.smtpFrom,
  });
}

export function getStoragePathFromUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;

  try {
    const pathParts = new URL(fileUrl).pathname.split('/').filter(Boolean);
    const storageIndex = pathParts.indexOf('storage');
    if (storageIndex !== -1) {
      return pathParts.slice(storageIndex + 1).join('/');
    }

    const uploadsIndex = pathParts.indexOf('uploads');
    if (uploadsIndex !== -1) {
      return pathParts.slice(uploadsIndex).join('/');
    }

    return null;
  } catch {
    return null;
  }
}

export async function downloadStoredFileToTempPath(
  fileUrl: string | null | undefined,
  storage: StorageService,
  prefix: string
): Promise<string | undefined> {
  const filePath = getStoragePathFromUrl(fileUrl);
  if (!filePath) return undefined;

  try {
    const fileData = await storage.download(filePath);
    const tempDir = mkdtempSync(join(tmpdir(), `${prefix}-`));
    const extension = fileUrl?.split('.').pop() || 'png';
    const localPath = join(tempDir, `${prefix}.${extension}`);
    writeFileSync(localPath, Buffer.from(fileData));
    return localPath;
  } catch {
    return undefined;
  }
}

export function cleanupTempFile(filePath: string | undefined) {
  if (!filePath) return;

  try {
    const tempDir = filePath.substring(0, filePath.lastIndexOf('/'));
    rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}
