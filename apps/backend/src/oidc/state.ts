import { SignJWT, jwtVerify } from 'jose';

export const STATE_COOKIE = 'oidc_state';
export const STATE_COOKIE_PATH = '/auth/oidc';
export const STATE_TTL_SECONDS = 10 * 60;

export interface LoginState {
  state: string;
  nonce: string;
  verifier: string;
  redirect: string;
}

const AUDIENCE = 'oidc-state';

export const randomToken = (bytes = 32) =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString('base64url');

export const pkceChallenge = async (verifier: string) =>
  Buffer.from(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  ).toString('base64url');

export const sealState = (payload: LoginState, secret: string) =>
  new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(AUDIENCE)
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));

export async function openState(cookie: string, secret: string): Promise<LoginState | null> {
  try {
    const { payload } = await jwtVerify(cookie, new TextEncoder().encode(secret), {
      audience: AUDIENCE,
    });
    const { state, nonce, verifier, redirect } = payload as Record<string, unknown>;
    if (
      typeof state !== 'string' ||
      typeof nonce !== 'string' ||
      typeof verifier !== 'string' ||
      typeof redirect !== 'string'
    ) {
      return null;
    }
    return { state, nonce, verifier, redirect };
  } catch {
    return null;
  }
}

export function safeRedirect(candidate: string | undefined, fallback: string, origin: string) {
  if (!candidate) return fallback;
  try {
    return new URL(candidate).origin === origin ? candidate : fallback;
  } catch {
    return fallback;
  }
}
