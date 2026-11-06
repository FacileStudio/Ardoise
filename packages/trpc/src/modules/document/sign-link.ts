import type { PrismaClient } from '@repo/database';
import { logger } from '@repo/logger';
import { isPlatformStudio } from '../space/studio';
import { PlumeError, contractExternalRef, getSigners, plumeConfigFromEnv, signingUrlFor, type PlumeEnv } from '@repo/plume';

type SignableDocument = {
  id: string;
  missionId: string | null;
  spaceId: string;
  clientName: string;
  plumeDocumentId: string | null;
  plumeClientSignUrl: string | null;
};

export async function resolveSignatureClient(
  db: PrismaClient,
  document: Pick<SignableDocument, 'missionId' | 'spaceId' | 'clientName'>
) {
  if (document.missionId) {
    const mission = await db.mission.findUnique({
      where: { id: document.missionId },
      select: { client: true },
    });
    if (mission?.client) return mission.client;
  }

  const matches = await db.client.findMany({
    where: { companyName: document.clientName, spaceId: document.spaceId },
    take: 2,
  });
  return matches.length === 1 ? matches[0] : null;
}

export async function ensureClientSignUrl(
  ctx: { db: PrismaClient; env: PlumeEnv },
  document: SignableDocument
): Promise<string | null> {
  if (document.plumeClientSignUrl) return document.plumeClientSignUrl;

  const plume = plumeConfigFromEnv(ctx.env);
  if (!plume || !document.plumeDocumentId) return null;
  if (!(await isPlatformStudio(ctx.db, document.spaceId))) return null;

  const client = await resolveSignatureClient(ctx.db, document);
  if (!client?.contactEmail) return null;

  try {
    const signers = await getSigners(plume, contractExternalRef(document.id));
    const url = signingUrlFor(signers, client.contactEmail);
    if (url) {
      await ctx.db.document.update({
        where: { id: document.id },
        data: { plumeClientSignUrl: url },
      });
    }
    return url;
  } catch (error) {
    if (!(error instanceof PlumeError)) throw error;
    logger.warn({ err: error, documentId: document.id }, 'Could not read the Plume signers');
    return null;
  }
}
