import env from '$lib/env';

export type AuthConfig = {
  ssoOnly: boolean;
  passwordLogin: boolean;
  clientMagicLink: boolean;
};

const apiUrl = env.API_URL?.replace(/\/trpc\/?$/, '').replace(/\/$/, '') ?? '';

export async function loadAuthConfig(): Promise<AuthConfig> {
  try {
    const res = await fetch(`${apiUrl}/auth/config`);
    const config = await res.json();
    return {
      ssoOnly: config.sso_only ?? false,
      passwordLogin: config.password_login ?? true,
      clientMagicLink: config.client_magic_link ?? true,
    };
  } catch {
    return { ssoOnly: false, passwordLogin: true, clientMagicLink: true };
  }
}
