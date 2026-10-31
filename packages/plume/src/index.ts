import { createHmac, timingSafeEqual } from 'node:crypto';

const REQUEST_TIMEOUT_MS = 20_000;
const SIGNATURE_PREFIX = 'sha256=';

export const PLUME_SIGNATURE_HEADER = 'x-plume-signature-256';
export const COMPLETED_EVENT = 'document.completed';
export const ARCHIVED_EVENT = 'document.archived';
export const DECLINED_EVENT = 'document.declined';

export interface PlumeConfig {
  url: string;
  token: string;
  webhookSecret: string;
}

export interface PlumeEnv {
  PLUME_URL?: string;
  PLUME_API_TOKEN?: string;
  PLUME_WEBHOOK_SECRET?: string;
}

export interface PlumeSigner {
  name: string;
  email: string;
  role?: string;
  order?: number;
}

export interface PlumeClient {
  name: string;
  email: string;
  company?: string;
}

export interface SendForSignatureInput {
  name: string;
  filename: string;
  pdf: Uint8Array;
  signers: PlumeSigner[];
  externalRef: string;
  client?: PlumeClient;
  nuageSpaceFacileId?: string;
  nuageLinkedTo?: string;
}

export interface PlumeSent {
  documentId: string;
  url: string | null;
}

export interface SignatureEvent {
  eventType: string;
  externalRef: string;
  plumeDocumentId: string | null;
  status: string | null;
  nuagePublished: boolean;
}

export class PlumeError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'PlumeError';
  }
}

export function plumeConfigFromEnv(env: PlumeEnv): PlumeConfig | null {
  if (!env.PLUME_URL || !env.PLUME_API_TOKEN || !env.PLUME_WEBHOOK_SECRET) return null;
  return {
    url: env.PLUME_URL.replace(/\/$/, ''),
    token: env.PLUME_API_TOKEN,
    webhookSecret: env.PLUME_WEBHOOK_SECRET,
  };
}

export function contractExternalRef(documentId: string): string {
  return `ardoise:contract:${documentId}`;
}

export function documentIdFromExternalRef(ref: string): string | null {
  const match = /^ardoise:contract:([^:\s]+)$/.exec(ref);
  return match ? match[1] : null;
}

export function signContractWebhook(secret: string, body: string): string {
  return SIGNATURE_PREFIX + createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  header: string | null | undefined
): boolean {
  if (!header) return false;
  const expected = Buffer.from(signContractWebhook(secret, body));
  const received = Buffer.from(header.trim());
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : typeof value === 'number' ? String(value) : null;

export function parseSignatureEvent(raw: string): SignatureEvent | null {
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!body || typeof body !== 'object') return null;
  const document = body.document ?? {};
  const externalRef = text(document.external_ref);
  const eventType = text(body.event_type);
  if (!externalRef || !eventType) return null;
  return {
    eventType,
    externalRef,
    plumeDocumentId: text(document.id),
    status: text(document.status),
    nuagePublished: document.nuage?.published === true,
  };
}

async function call(config: PlumeConfig, path: string, init: RequestInit): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`${config.url}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new PlumeError(`Plume is unreachable: ${(error as Error).message}`);
  }
  if (!response.ok) {
    throw new PlumeError(`Plume answered ${response.status} on ${path}`, response.status);
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

export async function sendForSignature(
  config: PlumeConfig,
  input: SendForSignatureInput
): Promise<PlumeSent> {
  const request: Record<string, unknown> = {
    name: input.name,
    send: true,
    external_ref: input.externalRef,
    signers: input.signers.map((signer, index) => ({
      name: signer.name,
      email: signer.email,
      role: signer.role ?? 'signer',
      order: signer.order ?? index + 1,
    })),
  };
  if (input.client) request.client = input.client;
  if (input.nuageSpaceFacileId) request.nuage_space_facile_id = input.nuageSpaceFacileId;
  if (input.nuageLinkedTo) request.nuage_linked_to = input.nuageLinkedTo;

  const form = new FormData();
  form.append('request', JSON.stringify(request));
  form.append(
    'file',
    new Blob([input.pdf as BlobPart], { type: 'application/pdf' }),
    input.filename
  );
  const created = await call(config, '/api/documents/signature-requests', {
    method: 'POST',
    body: form,
  });
  const id = text(created?.document?.id);
  if (!id) throw new PlumeError('Plume returned no document id');
  return { documentId: id, url: text(created.document.url) ?? `${config.url}/documents/${id}` };
}
