import { logger } from '@repo/logger';

const REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_MARGIN_MS = 30_000;
const EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';
const WRITE_SCOPE = 'nuage.write';
const REFRESH_LIFETIME_MS = 30 * 24 * 3600 * 1000;
const MAX_NAME_BYTES = 255;

export interface NuageConfig {
  url: string;
  audience: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
}

export interface NuageEnv {
  NUAGE_URL?: string;
  NUAGE_AUDIENCE?: string;
  OIDC_ISSUER?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
}

export interface SubjectTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshExpiresAt?: Date | null;
}

export interface SubjectTokenStore {
  load(userId: string): Promise<SubjectTokens | null>;
  save(userId: string, tokens: SubjectTokens): Promise<void>;
}

export interface StoreContractInput {
  userId: string;
  filename: string;
  pdf: Uint8Array;
  linkedTo: string;
}

export class NotConnectedError extends Error {
  constructor() {
    super('user has no Registre session Ardoise can act with');
  }
}

class RegistreError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(`registre answered ${status}${code ? `: ${code}` : ''}`);
  }
}

export function nuageConfigFromEnv(env: NuageEnv): NuageConfig | null {
  if (!env.NUAGE_URL || !env.NUAGE_AUDIENCE) return null;
  if (!env.OIDC_ISSUER || !env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET) return null;
  return {
    url: env.NUAGE_URL.replace(/\/$/, ''),
    audience: env.NUAGE_AUDIENCE,
    issuer: env.OIDC_ISSUER.replace(/\/$/, ''),
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
  };
}

const tokenEndpoints = new Map<string, Promise<string>>();

function tokenEndpoint(issuer: string): Promise<string> {
  let pending = tokenEndpoints.get(issuer);
  if (!pending) {
    pending = discoverTokenEndpoint(issuer);
    tokenEndpoints.set(issuer, pending);
    pending.catch(() => tokenEndpoints.delete(issuer));
  }
  return pending;
}

async function discoverTokenEndpoint(issuer: string): Promise<string> {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const document = (await response.json().catch(() => ({}))) as { token_endpoint?: unknown };
  if (!response.ok || typeof document.token_endpoint !== 'string') {
    throw new Error('registre discovery returned no token endpoint');
  }
  return document.token_endpoint;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

async function postToken(config: NuageConfig, form: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(
    `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`
  ).toString('base64');
  const response = await fetch(await tokenEndpoint(config.issuer), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.access_token) {
    throw new RegistreError(response.status, body.error ?? '');
  }
  return body;
}

const isInvalidGrant = (error: unknown) => error instanceof RegistreError && error.code === 'invalid_grant';

async function subjectToken(
  config: NuageConfig,
  store: SubjectTokenStore,
  userId: string,
  force: boolean
): Promise<string> {
  const stored = await store.load(userId);
  if (!stored) throw new NotConnectedError();
  const fresh =
    stored.accessToken && stored.expiresAt && stored.expiresAt.getTime() - TOKEN_MARGIN_MS > Date.now();
  if (!force && fresh) return stored.accessToken as string;
  if (!stored.refreshToken) throw new NotConnectedError();
  return refreshSubject(config, store, userId, stored.refreshToken);
}

async function refreshSubject(
  config: NuageConfig,
  store: SubjectTokenStore,
  userId: string,
  refreshToken: string
): Promise<string> {
  try {
    const refreshed = await postToken(config, { grant_type: 'refresh_token', refresh_token: refreshToken });
    await store.save(userId, {
      accessToken: refreshed.access_token as string,
      refreshToken: refreshed.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + (refreshed.expires_in ?? 0) * 1000),
      refreshExpiresAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
    });
    return refreshed.access_token as string;
  } catch (error) {
    if (!isInvalidGrant(error)) throw error;
    const current = await store.load(userId);
    if (current?.refreshToken && current.refreshToken !== refreshToken) {
      return refreshSubject(config, store, userId, current.refreshToken);
    }
    throw new NotConnectedError();
  }
}

const userChains = new Map<string, Promise<unknown>>();

function serialisedPerUser<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const previous = userChains.get(userId) ?? Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.catch(() => undefined);
  userChains.set(userId, tail);
  void tail.then(() => {
    if (userChains.get(userId) === tail) userChains.delete(userId);
  });
  return run;
}

/**
 * Trades the user's stored Registre access token for a five-minute Nuage token
 * (RFC 8693, scope nuage.write). Registre puts this client's id in `act.sub`,
 * which is how Nuage knows the caller is Ardoise.
 */
export function delegatedNuageToken(
  config: NuageConfig,
  store: SubjectTokenStore,
  userId: string
): Promise<string> {
  return serialisedPerUser(userId, () => exchangeForUser(config, store, userId));
}

async function exchangeForUser(
  config: NuageConfig,
  store: SubjectTokenStore,
  userId: string
): Promise<string> {
  for (const force of [false, true]) {
    const subject = await subjectToken(config, store, userId, force);
    try {
      const exchanged = await postToken(config, {
        grant_type: EXCHANGE_GRANT,
        subject_token: subject,
        subject_token_type: ACCESS_TOKEN_TYPE,
        audience: config.audience,
        scope: WRITE_SCOPE,
      });
      return exchanged.access_token as string;
    } catch (error) {
      if (!isInvalidGrant(error)) throw error;
    }
  }
  throw new NotConnectedError();
}

const unsafeName = new RegExp('[\\p{Cc}\\p{Cf}\\p{Zl}\\p{Zp}"]', 'gu');

/**
 * Makes a document name acceptable to Nuage's object-name rules: slashes,
 * backslashes, quotes, control and invisible characters become dashes or
 * vanish, ".pdf" is ensured, and the result is cut to 255 bytes on a character
 * boundary.
 */
export function nuageObjectName(title: string): string {
  const cleaned = title
    .replace(/[/\\]/g, '-')
    .replace(unsafeName, '')
    .trim();
  const base = cleaned || 'document';
  const named = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  return truncateUtf8(named, MAX_NAME_BYTES);
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value) <= maxBytes) return value;
  const suffix = '.pdf';
  const head = Array.from(value.slice(0, -suffix.length));
  while (head.length > 0 && Buffer.byteLength(head.join('')) + suffix.length > maxBytes) head.pop();
  return `${head.join('').trim() || 'document'}${suffix}`;
}

/** Asks Registre to revoke a refresh token (RFC 7009). Best effort: failures are logged and swallowed. */
export async function revokeRefreshToken(
  config: Pick<NuageConfig, 'issuer' | 'clientId' | 'clientSecret'>,
  refreshToken: string
): Promise<void> {
  try {
    const response = await fetch(`${config.issuer}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const document = (await response.json().catch(() => ({}))) as { revocation_endpoint?: unknown };
    if (typeof document.revocation_endpoint !== 'string') return;
    const basic = Buffer.from(
      `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`
    ).toString('base64');
    await fetch(document.revocation_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
      body: new URLSearchParams({ token: refreshToken, token_type_hint: 'refresh_token' }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn({ err: error }, 'Could not revoke the Registre refresh token');
  }
}

export async function storeContractInNuage(
  config: NuageConfig | null,
  store: SubjectTokenStore,
  { userId, filename, pdf, linkedTo }: StoreContractInput
): Promise<void> {
  if (!config) return;
  try {
    const token = await delegatedNuageToken(config, store, userId);
    const query = new URLSearchParams({ key: linkedTo, name: nuageObjectName(filename) });
    const response = await fetch(`${config.url}/api/app/object?${query}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' },
      body: pdf as BodyInit,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`upload failed with status ${response.status}`);
    }
    logger.info({ filename }, 'Contract stored in Nuage');
  } catch (error) {
    logger.warn({ err: error, filename }, 'Could not store contract in Nuage');
  }
}
