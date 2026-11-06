import type { PrismaClient } from '@repo/database';
import type { Logger } from '@repo/logger';
import { createHmac, randomUUID } from 'node:crypto';
import { decryptSecretStrict, getSettingsRecord } from '../settings/service';
import { getSpaceSettings } from '../space/settings';
import { isPlatformStudio } from '../space/studio';
import { postToSpaceWebhook, type Transport, type Resolver } from './outbound';

type WebhookActor = {
  id: string;
  email?: string | null;
  role?: string | null;
};

type DispatchWebhookInput = {
  db: PrismaClient;
  log: Logger;
  /**
   * The space the event belongs to, or null for a platform event (settings,
   * admin engine). The platform webhook only hears platform studio spaces.
   */
  spaceId: string | null;
  event: string;
  actor?: WebhookActor;
  data: Record<string, unknown>;
  deps?: { resolver?: Resolver; transport?: Transport };
};

export function shouldDispatch(subscriptions: string[], event: string) {
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

export function createSignature(secret: string, body: string) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

function buildDelivery(event: string, actor: WebhookActor | undefined, data: Record<string, unknown>) {
  const deliveryId = randomUUID();
  const body = JSON.stringify({
    id: deliveryId,
    event,
    createdAt: new Date().toISOString(),
    source: 'ardoise',
    actor,
    data,
  });
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'Ardoise-Webhooks/1.0',
    'x-ardoise-delivery': deliveryId,
    'x-ardoise-event': event,
  };
  return { deliveryId, body, headers };
}

async function dispatchSpaceWebhook({ db, log, spaceId, event, actor, data, deps }: DispatchWebhookInput) {
  if (spaceId === null) return;
  const settings = await getSpaceSettings(db, spaceId);
  const webhookUrl = settings.webhookUrl?.trim();
  if (!webhookUrl || !shouldDispatch(settings.webhookEvents.filter(Boolean), event)) return;

  const { deliveryId, body, headers } = buildDelivery(event, actor, data);
  try {
    if (settings.webhookSecret) {
      headers['x-ardoise-signature-256'] = createSignature(decryptSecretStrict(settings.webhookSecret), body);
    }
    const status = await postToSpaceWebhook(webhookUrl, headers, body, deps);
    if (status >= 200 && status < 300) {
      log.info({ type: 'space-webhook-delivery', spaceId, deliveryId, event, status }, 'Space webhook delivered');
      return;
    }
    log.warn({ type: 'space-webhook-delivery', spaceId, deliveryId, event, status }, 'Space webhook delivery failed');
  } catch (error) {
    log.error(
      { type: 'space-webhook-delivery', spaceId, deliveryId, event, error: error instanceof Error ? error.message : 'error' },
      'Space webhook delivery errored'
    );
  }
}

export async function dispatchConfiguredWebhook(input: DispatchWebhookInput) {
  await dispatchSpaceWebhook(input);
  await dispatchPlatformWebhook(input);
}

async function dispatchPlatformWebhook({
  db,
  log,
  spaceId,
  event,
  actor,
  data,
}: DispatchWebhookInput) {
  if (spaceId !== null && !(await isPlatformStudio(db, spaceId))) return;
  const settings = await getSettingsRecord(db);
  const webhookUrl = settings.webhookUrl?.trim();

  if (!webhookUrl) {
    return;
  }

  const subscriptions = settings.webhookEvents.filter(Boolean);
  if (!shouldDispatch(subscriptions, event)) {
    return;
  }

  const { deliveryId, body, headers: plain } = buildDelivery(event, actor, data);
  const headers = new Headers(plain);

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
