import type { StorageService } from '@repo/storage';
import { logger } from '@repo/logger';
import { cleanupTempFile, downloadStoredFileToTempPath } from '../settings/service';
import { generateDocument } from './service';

async function downloadLogoFromS3(logoUrl: string | null | undefined, storage: StorageService): Promise<string | undefined> {
  if (!logoUrl || (!logoUrl.includes('storageapi.dev') && !logoUrl.includes('/storage/'))) {
    return undefined;
  }

  try {
    return await downloadStoredFileToTempPath(logoUrl, storage, 'logo');
  } catch (error) {
    logger.error({ err: error }, 'Failed to download logo from S3');
    return undefined;
  }
}

export async function generateDocumentWithLogo(
  documentData: any,
  logoUrl: string | null | undefined,
  storage: StorageService
): Promise<Buffer> {
  const logoPath = await downloadLogoFromS3(logoUrl, storage);

  try {
    return await generateDocument(documentData, logoPath);
  } finally {
    cleanupTempFile(logoPath);
  }
}
