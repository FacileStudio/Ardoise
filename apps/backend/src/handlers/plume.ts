import type { Context } from 'hono';
import { prisma } from '@repo/database';
import type { ServerEnv } from '@repo/env';
import {
  ARCHIVED_EVENT,
  COMPLETED_EVENT,
  DECLINED_EVENT,
  PLUME_SIGNATURE_HEADER,
  documentIdFromExternalRef,
  parseSignatureEvent,
  plumeConfigFromEnv,
  verifyWebhookSignature,
} from '@repo/plume';
import { plumeWebhookSecretsFor } from '@repo/trpc/plume-account';
import { logger } from '../lib/logger';

const HANDLED_EVENTS = [COMPLETED_EVENT, ARCHIVED_EVENT, DECLINED_EVENT];

/**
 * The secrets an event may be signed with: those of the space that owns the
 * document it names, so one tenant's Plume account can never move another
 * space's document. An event naming no known document can only carry the
 * platform secret (Plume's test delivery, or a foreign ref to ignore).
 */
async function secretsForDocument(env: ServerEnv, documentId: string | null, platformSecret: string): Promise<string[]> {
  if (!documentId) return [platformSecret];
  const document = await prisma.document.findUnique({ where: { id: documentId }, select: { spaceId: true } });
  if (!document) return [platformSecret];
  return plumeWebhookSecretsFor(prisma, env, document.spaceId);
}

export const createPlumeWebhookHandler = (env: ServerEnv) => {
  const config = plumeConfigFromEnv(env);

  return async (c: Context) => {
    if (!config) return c.json({ error: 'Plume is not configured' }, 404);

    const rawBody = await c.req.text();
    const signature = c.req.header(PLUME_SIGNATURE_HEADER);
    const event = parseSignatureEvent(rawBody);
    const documentId = event ? documentIdFromExternalRef(event.externalRef) : null;
    const secrets = await secretsForDocument(env, documentId, config.webhookSecret);
    if (!secrets.some((secret) => verifyWebhookSignature(secret, rawBody, signature))) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    if (!event || !documentId) return c.json({ ignored: true });
    if (!HANDLED_EVENTS.includes(event.eventType)) return c.json({ ignored: true });

    const plumeDocumentId = event.plumeDocumentId ? { plumeDocumentId: event.plumeDocumentId } : {};
    let changed = 0;

    if (event.eventType === COMPLETED_EVENT) {
      ({ count: changed } = await prisma.document.updateMany({
        where: { id: documentId, signatureStatus: { not: 'signed' } },
        data: { signatureStatus: 'signed', signedAt: new Date(), ...plumeDocumentId },
      }));
    } else if (event.eventType === DECLINED_EVENT) {
      ({ count: changed } = await prisma.document.updateMany({
        where: { id: documentId, signatureStatus: { in: ['none', 'sent'] } },
        data: { signatureStatus: 'declined', ...plumeDocumentId },
      }));
    } else if (event.nuagePublished) {
      ({ count: changed } = await prisma.document.updateMany({
        where: { id: documentId, nuageArchivedAt: null },
        data: { nuageArchivedAt: new Date(), ...plumeDocumentId },
      }));
    }

    if (changed > 0) {
      logger.info({ documentId, event: event.eventType }, 'Document updated from Plume');
    }
    return c.json({ received: true, duplicate: changed === 0 });
  };
};
