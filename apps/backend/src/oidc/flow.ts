import { jwtVerify, type JWTPayload } from 'jose';
import type { OidcConfig } from './config';
import { loadProvider } from './provider';
import { openState, pkceChallenge, randomToken, safeRedirect, sealState } from './state';

export interface OidcClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
}

export class OidcFlowError extends Error {}

const str = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined);

export function claimsFromPayload(payload: JWTPayload): OidcClaims {
  const sub = str(payload.sub);
  const email = str(payload.email);
  if (!sub) throw new OidcFlowError('id token has no sub');
  if (!email) throw new OidcFlowError('id token has no email');

  return {
    sub,
    email,
    emailVerified: payload.email_verified === true,
    givenName: str(payload.given_name),
    familyName: str(payload.family_name),
    name: str(payload.name),
    picture: str(payload.picture),
  };
}

export async function startLogin(config: OidcConfig, requestedRedirect?: string) {
  const provider = await loadProvider(config.issuer);
  const state = randomToken(16);
  const nonce = randomToken(16);
  const verifier = randomToken(32);
  const redirect = safeRedirect(requestedRedirect, config.successUrl, config.frontendOrigin);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUrl,
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
  });

  return {
    url: `${provider.authorizationEndpoint}?${params}`,
    cookie: await sealState({ state, nonce, verifier, redirect }, config.stateSecret),
  };
}

export async function finishLogin(
  config: OidcConfig,
  input: { code?: string; state?: string; cookie?: string }
) {
  if (!input.code || !input.state || !input.cookie) throw new OidcFlowError('missing parameters');

  const saved = await openState(input.cookie, config.stateSecret);
  if (!saved || saved.state !== input.state) throw new OidcFlowError('invalid state');

  const provider = await loadProvider(config.issuer);
  const basic = Buffer.from(
    `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`
  ).toString('base64');

  const res = await fetch(provider.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: config.redirectUrl,
      code_verifier: saved.verifier,
    }),
  });
  if (!res.ok) throw new OidcFlowError(`token exchange failed: ${res.status}`);

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new OidcFlowError('provider returned no id_token');

  const { payload } = await jwtVerify(idToken, provider.jwks, {
    issuer: provider.issuer,
    audience: config.clientId,
  });
  if (payload.nonce !== saved.nonce) throw new OidcFlowError('nonce mismatch');

  return { claims: claimsFromPayload(payload), redirect: saved.redirect };
}
