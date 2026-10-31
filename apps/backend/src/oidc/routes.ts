import type { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { prisma } from '@repo/database';
import type { AuthManager } from '@repo/auth';
import type { ServerEnv } from '@repo/env';
import type { StorageService } from '@repo/storage';
import { authCookies, issueSession } from '@repo/trpc/auth/session';
import { logger } from '../lib/logger';
import { adoptPicture } from './avatar';
import { oidcConfig } from './config';
import { finishLogin, startLogin } from './flow';
import { IdentityError, resolveUser } from './identity';
import { STATE_COOKIE, STATE_COOKIE_PATH, STATE_TTL_SECONDS } from './state';

const withParam = (url: string, key: string, value: string) => {
  const target = new URL(url);
  target.searchParams.set(key, value);
  return target.toString();
};

export function createOIDCRoutes(
  app: Hono,
  deps: { authManager: AuthManager; env: ServerEnv; storage: StorageService }
) {
  const { authManager, env, storage } = deps;
  const config = oidcConfig(env);

  app.get('/auth/config', (c) =>
    c.json({
      oidc_enabled: config !== null,
      sso_only: env.SSO_ONLY,
      password_login: !env.SSO_ONLY,
    })
  );

  if (!config) return;

  const cookieOptions = {
    path: STATE_COOKIE_PATH,
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.cookies.secure,
  } as const;

  app.get('/auth/oidc', async (c) => {
    try {
      const login = await startLogin(config, c.req.query('redirect'));
      setCookie(c, STATE_COOKIE, login.cookie, { ...cookieOptions, maxAge: STATE_TTL_SECONDS });
      return c.redirect(login.url);
    } catch (error) {
      logger.error({ error }, '[OIDC] Failed to start login');
      return c.json({ error: 'OIDC login unavailable' }, 502);
    }
  });

  app.get('/auth/oidc/callback', async (c) => {
    const cookie = getCookie(c, STATE_COOKIE);
    deleteCookie(c, STATE_COOKIE, cookieOptions);

    try {
      const { claims, redirect } = await finishLogin(config, {
        code: c.req.query('code'),
        state: c.req.query('state'),
        cookie,
      });

      try {
        const user = await resolveUser(prisma, config.issuer, claims);
        if (claims.picture) user.avatarUrl ??= await adoptPicture(user.id, claims.picture, storage);

        const session = await issueSession(prisma, authManager, user, {
          ipAddress: c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
          userAgent: c.req.header('user-agent'),
        });
        for (const value of authCookies(session.token, session.refreshToken, config.cookies)) {
          c.header('Set-Cookie', value, { append: true });
        }
        return c.redirect(withParam(redirect, 'oidc', 'success'));
      } catch (error) {
        if (error instanceof IdentityError) {
          logger.warn({ email: claims.email, reason: error.code }, '[OIDC] Login refused');
          return c.redirect(withParam(redirect, 'error', error.code));
        }
        throw error;
      }
    } catch (error) {
      logger.error({ error }, '[OIDC] Callback failed');
      return c.redirect(withParam(config.successUrl, 'error', 'oidc_failed'));
    }
  });
}
