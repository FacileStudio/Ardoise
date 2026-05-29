import type { Hono } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '@repo/database';
import type { AuthManager } from '@repo/auth';
import type { ServerEnv } from '@repo/env';
import type { StorageService } from '@repo/storage';
import { UserRole } from '@repo/types';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@repo/trpc/context';

interface OIDCDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
}

interface OIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  successUrl: string;
}

let cachedDiscovery: OIDCDiscovery | null = null;
let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

async function fetchDiscovery(issuer: string): Promise<OIDCDiscovery> {
  if (cachedDiscovery) return cachedDiscovery;

  const url = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);

  const data = (await res.json()) as OIDCDiscovery;
  cachedDiscovery = data;
  cachedJWKS = createRemoteJWKSet(new URL(data.jwks_uri));
  return data;
}

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!cachedJWKS) throw new Error('JWKS not initialized');
  return cachedJWKS;
}

function getOIDCConfig(env: ServerEnv): OIDCConfig | null {
  if (!env.OIDC_ISSUER || !env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET || !env.OIDC_REDIRECT_URL) {
    return null;
  }
  return {
    issuer: env.OIDC_ISSUER,
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    redirectUrl: env.OIDC_REDIRECT_URL,
    successUrl: env.OIDC_SUCCESS_URL || env.FRONTEND_URL,
  };
}

export function isOIDCEnabled(env: ServerEnv): boolean {
  return getOIDCConfig(env) !== null;
}

function setAuthCookiesOnResponse(
  c: { header: (name: string, value: string, options?: { append: boolean }) => void },
  accessToken: string,
  refreshToken: string,
  env: ServerEnv
) {
  const isProduction = env.NODE_ENV === 'production';

  const accessCookie = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(accessToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${15 * 60}`,
    ...(isProduction ? ['Secure'] : []),
  ].join('; ');
  c.header('Set-Cookie', accessCookie, { append: true });

  const refreshCookie = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    'Path=/trpc/auth.refresh',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
    ...(isProduction ? ['Secure'] : []),
  ].join('; ');
  c.header('Set-Cookie', refreshCookie, { append: true });
}

function extractCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchOIDCAvatar(
  pictureUrl: string,
  userId: string,
  storage: StorageService
): Promise<{ url: string; key: string; size: number; mimeType: string } | null> {
  try {
    const parsed = new URL(pictureUrl);
    if (parsed.protocol !== 'https:') return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(pictureUrl, {
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 5 * 1024 * 1024) return null;

    const ext = contentType.includes('png')
      ? '.png'
      : contentType.includes('gif')
        ? '.gif'
        : contentType.includes('webp')
          ? '.webp'
          : '.jpg';
    const mimeType = contentType.includes('png')
      ? 'image/png'
      : contentType.includes('gif')
        ? 'image/gif'
        : contentType.includes('webp')
          ? 'image/webp'
          : 'image/jpeg';
    const key = `uploads/${userId}/oidc-avatar-${Date.now()}${ext}`;

    await storage.upload(key, buffer, mimeType);
    const url = storage.getFileUrl(key);
    return { url, key, size: buffer.byteLength, mimeType };
  } catch {
    return null;
  }
}

export function createOIDCRoutes(
  app: Hono,
  config: { authManager: AuthManager; env: ServerEnv; storage: StorageService }
) {
  const { authManager, env, storage } = config;

  app.get('/auth/config', (c) => {
    return c.json({
      oidc_enabled: isOIDCEnabled(env),
      sso_only: env.SSO_ONLY,
    });
  });

  const allowedOrigins = [env.FRONTEND_URL];

  app.get('/auth/oidc', async (c) => {
    const oidc = getOIDCConfig(env);
    if (!oidc) {
      return c.json({ error: 'OIDC not configured' }, 400);
    }

    const redirectTo = c.req.query('redirect') || oidc.successUrl;
    const validRedirect = allowedOrigins.some((o) => redirectTo.startsWith(o))
      ? redirectTo
      : oidc.successUrl;

    const discovery = await fetchDiscovery(oidc.issuer);
    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    const statePayload = JSON.stringify({ nonce: btoa(String.fromCharCode(...stateBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), redirect: validRedirect });
    const state = btoa(statePayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const isProduction = env.NODE_ENV === 'production';
    const stateCookie = [
      `oidc_state=${encodeURIComponent(state)}`,
      'Path=/auth/oidc',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${10 * 60}`,
      ...(isProduction ? ['Secure'] : []),
    ].join('; ');
    c.header('Set-Cookie', stateCookie);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: oidc.clientId,
      redirect_uri: oidc.redirectUrl,
      scope: 'openid email profile offline_access',
      state,
    });

    return c.redirect(`${discovery.authorization_endpoint}?${params.toString()}`);
  });

  app.get('/auth/oidc/callback', async (c) => {
    const oidc = getOIDCConfig(env);
    if (!oidc) {
      return c.redirect(`${env.FRONTEND_URL}?error=oidc_not_configured`);
    }

    let successUrl = oidc.successUrl;

    try {
      const code = c.req.query('code');
      const state = c.req.query('state');

      if (!code || !state) {
        return c.redirect(`${successUrl}?error=oidc_failed`);
      }

      const cookieHeader = c.req.header('cookie') ?? null;
      const savedState = extractCookie(cookieHeader, 'oidc_state');

      if (!savedState || savedState !== state) {
        return c.redirect(`${successUrl}?error=oidc_failed`);
      }

      try {
        const decoded = JSON.parse(atob(savedState.replace(/-/g, '+').replace(/_/g, '/')));
        if (decoded.redirect && allowedOrigins.some((o) => decoded.redirect.startsWith(o))) {
          successUrl = decoded.redirect;
        }
      } catch { /* invalid state cookie — use default successUrl */ }

      const isProduction = env.NODE_ENV === 'production';
      const clearStateCookie = [
        'oidc_state=',
        'Path=/auth/oidc',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0',
        ...(isProduction ? ['Secure'] : []),
      ].join('; ');
      c.header('Set-Cookie', clearStateCookie, { append: true });

      const discovery = await fetchDiscovery(oidc.issuer);

      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: oidc.redirectUrl,
        client_id: oidc.clientId,
        client_secret: oidc.clientSecret,
      });

      const tokenRes = await fetch(discovery.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });

      if (!tokenRes.ok) {
        return c.redirect(`${successUrl}?error=oidc_failed`);
      }

      const tokenData = (await tokenRes.json()) as {
        id_token?: string;
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };
      if (!tokenData.id_token) {
        return c.redirect(`${successUrl}?error=oidc_failed`);
      }

      const { payload } = await jwtVerify(tokenData.id_token, getJWKS(), {
        issuer: oidc.issuer,
        audience: oidc.clientId,
      });

      const email = payload.email as string | undefined;
      const picture = payload.picture as string | undefined;
      if (!email) {
        return c.redirect(`${successUrl}?error=oidc_failed`);
      }

      let user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatar: { select: { url: true } },
          coverImage: { select: { url: true } },
        },
      });

      if (!user) {
        const firstName =
          (payload.given_name as string) ||
          (payload.name as string) ||
          email.split('@')[0];
        const lastName = (payload.family_name as string) || '';
        const passwordHash = await authManager.hashPassword(crypto.randomUUID());

        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            password: passwordHash,
            role: UserRole.CLIENT,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatar: { select: { url: true } },
            coverImage: { select: { url: true } },
          },
        });
      }

      if (picture && !user.avatar) {
        const avatarData = await fetchOIDCAvatar(picture, user.id, storage);
        if (avatarData) {
          await prisma.media.create({
            data: {
              url: avatarData.url,
              key: avatarData.key,
              mimeType: avatarData.mimeType,
              size: avatarData.size,
              avatarUserId: user.id,
            },
          });
          user = { ...user, avatar: { url: avatarData.url } };
        }
      }

      const sessionUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as unknown as UserRole,
        avatarUrl: user.avatar?.url ?? null,
        coverImageUrl: user.coverImage?.url ?? null,
      };

      const accessToken = await authManager.createToken(sessionUser);
      const refresh = await authManager.createRefreshToken(sessionUser.id);

      const ipAddress =
        c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || undefined;
      const userAgent = c.req.header('user-agent') || undefined;

      await prisma.session.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          token: refresh.token,
          expiresAt: refresh.expiresAt,
          ipAddress,
          userAgent,
        },
      });

      if (tokenData.access_token) {
        const expiresAt = tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null;
        await prisma.account.upsert({
          where: {
            providerId_accountId: {
              providerId: 'oidc',
              accountId: email,
            },
          },
          update: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token ?? null,
            accessTokenExpiresAt: expiresAt,
            idToken: tokenData.id_token,
          },
          create: {
            id: crypto.randomUUID(),
            userId: user.id,
            providerId: 'oidc',
            accountId: email,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token ?? null,
            accessTokenExpiresAt: expiresAt,
            idToken: tokenData.id_token,
          },
        });
      }

      setAuthCookiesOnResponse(c, accessToken, refresh.token, env);

      const sep = successUrl.includes('?') ? '&' : '?';
      return c.redirect(`${successUrl}${sep}oidc=success`);
    } catch {
      return c.redirect(`${successUrl}?error=oidc_failed`);
    }
  });

  app.post('/auth/sync-profile', async (c) => {
    try {
      const oidc = getOIDCConfig(env);
      if (!oidc) return c.json({ synced: false });

      const cookieHeader = c.req.header('cookie') ?? null;
      const token = extractCookie(cookieHeader, AUTH_COOKIE_NAME);
      if (!token) return c.json({ synced: false }, 401);

      const tokenUser = await authManager.verifyToken(token);
      if (!tokenUser) return c.json({ synced: false }, 401);

      const user = await prisma.user.findUnique({
        where: { id: tokenUser.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profileSyncedAt: true,
          avatar: { select: { id: true, url: true, key: true } },
        },
      });
      if (!user) return c.json({ synced: false }, 401);

      if (user.profileSyncedAt && Date.now() - user.profileSyncedAt.getTime() < 5 * 60 * 1000) {
        return c.json({ synced: false, reason: 'rate_limited' });
      }

      const account = await prisma.account.findUnique({
        where: {
          providerId_accountId: {
            providerId: 'oidc',
            accountId: user.email,
          },
        },
      });
      if (!account?.accessToken) return c.json({ synced: false });

      const discovery = await fetchDiscovery(oidc.issuer);

      let accessToken = account.accessToken;
      let userInfoRes = await fetch(discovery.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userInfoRes.status === 401 && account.refreshToken) {
        const refreshRes = await fetch(discovery.token_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: account.refreshToken,
            client_id: oidc.clientId,
            client_secret: oidc.clientSecret,
          }).toString(),
        });

        if (!refreshRes.ok) return c.json({ synced: false });

        const refreshData = (await refreshRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in?: number;
        };

        accessToken = refreshData.access_token;
        const expiresAt = refreshData.expires_in
          ? new Date(Date.now() + refreshData.expires_in * 1000)
          : null;

        await prisma.account.update({
          where: { id: account.id },
          data: {
            accessToken: refreshData.access_token,
            refreshToken: refreshData.refresh_token ?? account.refreshToken,
            accessTokenExpiresAt: expiresAt,
          },
        });

        userInfoRes = await fetch(discovery.userinfo_endpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      if (!userInfoRes.ok) return c.json({ synced: false });

      const userInfo = (await userInfoRes.json()) as {
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      };

      const firstName = userInfo.given_name || userInfo.name || user.firstName;
      const lastName = userInfo.family_name || user.lastName;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          profileSyncedAt: new Date(),
        },
      });

      if (userInfo.picture) {
        const avatarData = await fetchOIDCAvatar(userInfo.picture, user.id, storage);
        if (avatarData) {
          if (user.avatar) {
            await storage.delete(user.avatar.key).catch(() => {});
            await prisma.media.update({
              where: { id: user.avatar.id },
              data: {
                url: avatarData.url,
                key: avatarData.key,
                mimeType: avatarData.mimeType,
                size: avatarData.size,
              },
            });
          } else {
            await prisma.media.create({
              data: {
                url: avatarData.url,
                key: avatarData.key,
                mimeType: avatarData.mimeType,
                size: avatarData.size,
                avatarUserId: user.id,
              },
            });
          }
        }
      }

      return c.json({ synced: true });
    } catch {
      return c.json({ synced: false });
    }
  });
}
