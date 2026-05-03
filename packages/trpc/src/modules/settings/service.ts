import type { PrismaClient, Prisma } from '@repo/database';
import type { StorageService } from '@repo/storage';
import { StripeService } from '@repo/stripe';
import { SMTPClient } from '@repo/smtp';
import type { UpdateSettingsInput } from './types';
import { TRPCError } from '@trpc/server';

const SETTINGS_ID = 'global';
const LOGO_KEY = 'settings/logo.png';

const secretFields = [
  'stripeSecretKey',
  'stripeWebhookSecret',
  'smtpPass',
] as const;

function redactSecrets<T extends Record<string, unknown>>(settings: T) {
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
