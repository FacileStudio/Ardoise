import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const REQUEST_TIMEOUT_MS = 10_000;
const SIGNATURE_PREFIX = 'sha256=';
const DEFAULT_RETRY_DELAYS_MS = [1_000, 5_000, 30_000];

export const WEBHOOK_PATH = '/api/integrations/ardoise/webhook';
export const EVENT_HEADER = 'X-Ardoise-Event';
export const DELIVERY_HEADER = 'X-Ardoise-Delivery';
export const SIGNATURE_HEADER = 'X-Ardoise-Signature-256';
export const SYNC_SOURCE_HEADER = 'X-Sync-Source';
export const GLOUTON_SOURCE = 'glouton';

export type GloutonEvent =
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'mission.quote_generated'
  | 'mission.quote_accepted'
  | 'mission.invoice_generated'
  | 'mission.payment_created';

export interface GloutonConfig {
  url: string;
  token: string;
  webhookSecret: string;
}

export interface GloutonEnv {
  GLOUTON_URL?: string;
  GLOUTON_API_TOKEN?: string;
  GLOUTON_WEBHOOK_SECRET?: string;
}

export interface GloutonLogger {
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
}

export interface ClientPayload {
  id?: string;
  gloutonCompanyId: string;
  registreSpaceId: string | null;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  siret: string | null;
  tvaIntracom: string | null;
  updatedAt: string;
  actorEmail?: string;
}

export type OutboundClientPayload = Omit<ClientPayload, 'gloutonCompanyId'> & {
  gloutonCompanyId: string | null;
};

export interface ClientRecord {
  id: string;
  gloutonCompanyId: string | null;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  siret: string | null;
  tvaIntracom: string | null;
  updatedAt: Date;
  space?: { registreSpaceId: string | null } | null;
}

export interface MissionEventData {
  clientId: string;
  missionId: string;
  missionTitle: string;
  amountCents?: number;
  currency?: string;
  documentNumber?: string;
  url?: string;
}

export interface DeliveryOptions {
  log: GloutonLogger;
  retryDelaysMs?: number[];
}

export function gloutonConfigFromEnv(env: GloutonEnv): GloutonConfig | null {
  if (!env.GLOUTON_URL || !env.GLOUTON_API_TOKEN || !env.GLOUTON_WEBHOOK_SECRET) return null;
  return {
    url: env.GLOUTON_URL.replace(/\/$/, ''),
    token: env.GLOUTON_API_TOKEN,
    webhookSecret: env.GLOUTON_WEBHOOK_SECRET,
  };
}

export function companyUrl(config: GloutonConfig, gloutonCompanyId: string): string {
  return `${config.url}/app/contacts/companies/${encodeURIComponent(gloutonCompanyId)}`;
}

export function signBody(secret: string, body: string): string {
  return SIGNATURE_PREFIX + createHmac('sha256', secret).update(body).digest('hex');
}

const constantTimeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export function verifySignature(
  secret: string,
  body: string,
  header: string | null | undefined
): boolean {
  if (!header) return false;
  return constantTimeEqual(signBody(secret, body), header.trim());
}

export function bearerMatches(expected: string, header: string | null | undefined): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  return constantTimeEqual(expected, header.slice('Bearer '.length).trim());
}

export function toClientPayload(client: ClientRecord): OutboundClientPayload {
  return {
    id: client.id,
    gloutonCompanyId: client.gloutonCompanyId,
    registreSpaceId: client.space?.registreSpaceId ?? null,
    companyName: client.companyName,
    contactFirstName: client.contactFirstName,
    contactLastName: client.contactLastName,
    contactEmail: client.contactEmail,
    billingAddress: client.billingAddress,
    billingCity: client.billingCity,
    billingPostalCode: client.billingPostalCode,
    billingCountry: client.billingCountry,
    siret: client.siret,
    tvaIntracom: client.tvaIntracom,
    updatedAt: client.updatedAt.toISOString(),
  };
}

export function toCents(
  amount: { toString(): string } | number | null | undefined
): number | undefined {
  if (amount === null || amount === undefined) return undefined;
  const value = Number(amount.toString());
  return Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

export function buildDelivery(config: GloutonConfig, event: GloutonEvent, data: unknown) {
  const id = randomUUID();
  const body = JSON.stringify({ id, event, occurredAt: new Date().toISOString(), data });
  return {
    id,
    body,
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Ardoise-Glouton-Sync/1.0',
      [EVENT_HEADER]: event,
      [DELIVERY_HEADER]: id,
      [SIGNATURE_HEADER]: signBody(config.webhookSecret, body),
    },
  };
}

const retryable = (status: number) => status === 429 || status >= 500;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function deliver(
  config: GloutonConfig,
  event: GloutonEvent,
  data: unknown,
  { log, retryDelaysMs = DEFAULT_RETRY_DELAYS_MS }: DeliveryOptions
): Promise<boolean> {
  const delivery = buildDelivery(config, event, data);
  const meta = { type: 'glouton-delivery', deliveryId: delivery.id, event };
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await wait(retryDelaysMs[attempt - 1]);
    let status = 0;
    try {
      const response = await fetch(`${config.url}${WEBHOOK_PATH}`, {
        method: 'POST',
        headers: delivery.headers,
        body: delivery.body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      status = response.status;
      if (response.ok) {
        log.info({ ...meta, status, attempt }, 'Glouton webhook delivered');
        return true;
      }
      if (!retryable(status)) break;
    } catch (error) {
      log.warn({ ...meta, attempt, error: (error as Error).message }, 'Glouton webhook errored');
    }
  }
  log.error(meta, 'Glouton webhook delivery failed');
  return false;
}

let warnedUnconfigured = false;

export function emit(
  config: GloutonConfig | null,
  event: GloutonEvent,
  load: () => Promise<unknown>,
  options: DeliveryOptions
): void {
  if (!config) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      options.log.info({ type: 'glouton-delivery' }, 'Glouton sync is off: GLOUTON_* is not set');
    }
    return;
  }
  void load()
    .then((data) => (data ? deliver(config, event, data, options) : false))
    .catch((error) =>
      options.log.error({ type: 'glouton-delivery', event, error }, 'Glouton webhook not built')
    );
}
