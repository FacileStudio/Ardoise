import type { PrismaClient, Prisma } from '@repo/database';
import type { StorageService } from '@repo/storage';
import { createStorageTicket } from '@repo/storage';
import { StripeService } from '@repo/stripe';
import { SMTPClient } from '@repo/smtp';
import type { UpdateSettingsInput } from './types';
import { TRPCError } from '@trpc/server';
import { CryptoService } from '@repo/crypto';
import { extname, join } from 'path';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { logger } from '@repo/logger';

const SETTINGS_ID = 'global';
const LOGO_KEY = 'settings/logo.png';

export const secretFields = [
  'stripeSecretKey',
  'stripeWebhookSecret',
  'smtpPass',
  'webhookSecret',
] as const;

let cryptoService: CryptoService | null = null;

function getCrypto(): CryptoService {
  if (!cryptoService) {
    const key = process.env.ENCRYPTION_SECRET;
    if (!key) {
      throw new Error('ENCRYPTION_SECRET is required to read or write settings secrets');
    }
    cryptoService = new CryptoService({ ENCRYPTION_KEY: key });
  }
  return cryptoService;
}

export function encryptSecret(value: string): string {
  return getCrypto().encrypt(value);
}

export function decryptSecretStrict(value: string): string {
  return getCrypto().decrypt(value);
}

export function decryptSecret(value: string): string {
  try {
    return getCrypto().decrypt(value);
  } catch {
    return value;
  }
}

export function redactSecrets<T extends Record<string, unknown>>(settings: T) {
  const result = { ...settings } as Record<string, unknown>;

  for (const field of secretFields) {
    if (result[field]) {
      result[field] = '';
    }
  }

  return result;
}

const PUBLIC_FIELDS = [
  'companyName',
  'companyLegal',
  'companyAddress',
  'companyCity',
  'companyCountry',
  'companySiret',
  'companyEmail',
  'companyPhone',
  'companyTvaIntracom',
  'companyLegalForm',
  'companyShareCapital',
  'companyRcsCity',
  'companyApeCode',
  'stripePublishableKey',
  'bankName',
  'iban',
  'bic',
  'logoUrl',
  'tvaRate',
] as const;

export function publicSettings(settings: Record<string, unknown>) {
  return Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, settings[field]]));
}

export async function getSettingsRecord(db: PrismaClient) {
  try {
    let settings = await db.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      settings = await db.settings.create({
        data: { id: SETTINGS_ID },
      });
    }

    return settings;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('does not exist') || message.includes('column')) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database schema is out of date. Please run migrations.',
        cause: error,
      });
    }
    throw error;
  }
}

export async function getSettings(db: PrismaClient) {
  return publicSettings(await getSettingsRecord(db));
}

export async function getAdminSettings(db: PrismaClient) {
  return redactSecrets(await getSettingsRecord(db));
}

export async function updateSettings(db: PrismaClient, data: UpdateSettingsInput) {
  const isSecretField = (key: string) =>
    secretFields.includes(key as (typeof secretFields)[number]);
  const normalizedEntries = Object.entries(data)
    .filter(([key, value]) => !isSecretField(key) || value !== '')
    .map(([key, value]) => {
      if (value === '') return [key, null];
      if (isSecretField(key) && typeof value === 'string') {
        return [key, encryptSecret(value)];
      }
      return [key, value];
    });
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

export async function getStripeService(db: PrismaClient) {
  const settings = await getSettingsRecord(db);
  const config = settings as unknown as Record<string, unknown>;

  if (
    typeof config.stripeSecretKey !== 'string' ||
    typeof config.stripeWebhookSecret !== 'string'
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Stripe is not configured',
    });
  }

  return new StripeService({
    apiKey: decryptSecret(config.stripeSecretKey),
    webhookSecret: decryptSecret(config.stripeWebhookSecret),
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
    pass: decryptSecret(config.smtpPass),
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
    const extension = /^\.(png|jpe?g|gif|webp|svg)$/i.exec(extname(filePath))?.[0].slice(1) ?? 'png';
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
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup temp file');
  }
}
