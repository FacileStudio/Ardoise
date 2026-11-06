import type { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { prisma } from '@repo/database';
import type { AuthManager } from '@repo/auth';
import type { ServerEnv } from '@repo/env';
import { authCookies, issueSession } from '@repo/trpc/auth/session';
import { saveSsoTokens } from '@repo/trpc/auth/sso-tokens';
import { clientIp } from '@repo/trpc/client-ip';
import { logger } from '../lib/logger';
import { oidcConfig } from './config';
import { finishLogin, startLogin } from './flow';
import { IdentityError, resolveUser } from './identity';
import { STATE_COOKIE, STATE_COOKIE_PATH, STATE_TTL_SECONDS } from './state';

const errorCode = (error: unknown) =>
  typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : 'unknown';

const withParam = (url: string, key: string, value: string) => {
  const target = new URL(url);
  target.searchParams.set(key, value);
  return target.toString();
};

export function createOIDCRoutes(
  app: Hono,
  deps: { authManager: AuthManager; env: ServerEnv }
) {
  const { authManager, env } = deps;
  const config = oidcConfig(env);

  app.get('/auth/config', (c) =>
    c.json({
      oidc_enabled: config !== null,
      client_magic_link: true,
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
      const { claims, redirect, tokens } = await finishLogin(config, {
        code: c.req.query('code'),
        state: c.req.query('state'),
        cookie,
      });

      try {
        const user = await resolveUser(prisma, config.issuer, claims);
        await saveSsoTokens(prisma, config.issuer, claims.sub, tokens, env.ENCRYPTION_SECRET).catch(
          (error) => logger.warn({ code: errorCode(error) }, '[OIDC] Could not keep the Registre tokens')
        );

        const session = await issueSession(prisma, authManager, user, {
          ipAddress: clientIp(c.req.header('x-forwarded-for')),
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
