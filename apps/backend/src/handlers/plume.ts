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
import { logger } from '../lib/logger';

const HANDLED_EVENTS = [COMPLETED_EVENT, ARCHIVED_EVENT, DECLINED_EVENT];

export const createPlumeWebhookHandler = (env: ServerEnv) => {
  const config = plumeConfigFromEnv(env);

  return async (c: Context) => {
    if (!config) return c.json({ error: 'Plume is not configured' }, 404);

    const rawBody = await c.req.text();
    const signature = c.req.header(PLUME_SIGNATURE_HEADER);
    if (!verifyWebhookSignature(config.webhookSecret, rawBody, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const event = parseSignatureEvent(rawBody);
    if (!event) return c.json({ ignored: true });
    if (!HANDLED_EVENTS.includes(event.eventType)) return c.json({ ignored: true });

    const documentId = documentIdFromExternalRef(event.externalRef);
    if (!documentId) return c.json({ ignored: true });

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
