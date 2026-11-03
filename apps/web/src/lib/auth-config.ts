import env from '$lib/env';

export type AuthConfig = {
  oidcEnabled: boolean;
  clientMagicLink: boolean;
};

const apiUrl = env.API_URL?.replace(/\/trpc\/?$/, '').replace(/\/$/, '') ?? '';

export async function loadAuthConfig(): Promise<AuthConfig> {
  try {
    const res = await fetch(`${apiUrl}/auth/config`);
    const config = await res.json();
    return {
      oidcEnabled: config.oidc_enabled ?? false,
      clientMagicLink: config.client_magic_link ?? true,
    };
  } catch {
    return { oidcEnabled: false, clientMagicLink: true };
  }
}
