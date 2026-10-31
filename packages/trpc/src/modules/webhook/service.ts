import type { PrismaClient } from '@repo/database';
import type { Logger } from '@repo/logger';
import { createHmac, randomUUID } from 'node:crypto';
import { getSettingsRecord } from '../settings/service';

type WebhookActor = {
  id: string;
  email?: string | null;
  role?: string | null;
};

type DispatchWebhookInput = {
  db: PrismaClient;
  log: Logger;
  event: string;
  actor?: WebhookActor;
  data: Record<string, unknown>;
};

function shouldDispatch(subscriptions: string[], event: string) {
  if (subscriptions.length === 0) return true;

  return subscriptions.some((subscription) => {
    const normalized = subscription.trim();
    if (!normalized) return false;
    if (normalized === '*' || normalized === event) return true;
    if (normalized.endsWith('*')) {
      return event.startsWith(normalized.slice(0, -1));
    }
    return false;
  });
}

function createSignature(secret: string, body: string) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export async function dispatchConfiguredWebhook({
  db,
  log,
  event,
  actor,
  data,
}: DispatchWebhookInput) {
  const settings = await getSettingsRecord(db);
  const webhookUrl = settings.webhookUrl?.trim();

  if (!webhookUrl) {
    return;
  }

  const subscriptions = settings.webhookEvents.filter(Boolean);
  if (!shouldDispatch(subscriptions, event)) {
    return;
  }

  const deliveryId = randomUUID();
  const payload = {
    id: deliveryId,
    event,
    createdAt: new Date().toISOString(),
    source: 'ardoise',
    actor,
    data,
  };
  const body = JSON.stringify(payload);
  const headers = new Headers({
    'content-type': 'application/json',
    'user-agent': 'Ardoise-Webhooks/1.0',
    'x-ardoise-delivery': deliveryId,
    'x-ardoise-event': event,
  });

  if (settings.webhookSecret) {
    headers.set('x-ardoise-signature-256', createSignature(settings.webhookSecret, body));
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      log.warn(
        {
          type: 'webhook-delivery',
          deliveryId,
          event,
          webhookUrl,
          status: response.status,
        },
        'Webhook delivery failed'
      );
      return;
    }

    log.info(
      {
        type: 'webhook-delivery',
        deliveryId,
        event,
        webhookUrl,
        status: response.status,
      },
      'Webhook delivered'
    );
  } catch (error) {
    log.error(
      {
        type: 'webhook-delivery',
        deliveryId,
        event,
        webhookUrl,
        error,
      },
      'Webhook delivery errored'
    );
  }
}
