import type { ServerEnv } from '@repo/env';

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  successUrl: string;
  frontendOrigin: string;
  stateSecret: string;
  secureCookies: boolean;
}

export function oidcConfig(env: ServerEnv): OidcConfig | null {
  if (!env.OIDC_ISSUER || !env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET) return null;

  return {
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    redirectUrl: env.OIDC_REDIRECT_URL ?? `${env.BACKEND_URL}/auth/oidc/callback`,
    successUrl: env.OIDC_SUCCESS_URL ?? `${env.FRONTEND_URL}/login`,
    frontendOrigin: new URL(env.FRONTEND_URL).origin,
    stateSecret: env.ENCRYPTION_SECRET,
    secureCookies: env.NODE_ENV === 'production',
  };
}
