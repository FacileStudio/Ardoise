import { createRemoteJWKSet } from 'jose';

export interface Provider {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwks: ReturnType<typeof createRemoteJWKSet>;
}

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { provider: Provider; expiresAt: number }>();

const trimSlash = (url: string) => url.replace(/\/$/, '');

export async function loadProvider(issuer: string): Promise<Provider> {
  const hit = cache.get(issuer);
  if (hit && hit.expiresAt > Date.now()) return hit.provider;

  const res = await fetch(`${trimSlash(issuer)}/.well-known/openid-configuration`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);

  const doc = (await res.json()) as {
    issuer?: string;
    authorization_endpoint?: string;
    token_endpoint?: string;
    jwks_uri?: string;
  };

  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) {
    throw new Error('OIDC discovery document is missing required endpoints');
  }
  if (!doc.issuer || trimSlash(doc.issuer) !== trimSlash(issuer)) {
    throw new Error('OIDC discovery issuer does not match OIDC_ISSUER');
  }

  const provider: Provider = {
    issuer: doc.issuer,
    authorizationEndpoint: doc.authorization_endpoint,
    tokenEndpoint: doc.token_endpoint,
    jwks: createRemoteJWKSet(new URL(doc.jwks_uri)),
  };
  cache.set(issuer, { provider, expiresAt: Date.now() + TTL_MS });
  return provider;
}
