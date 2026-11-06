import { TRPCError } from '@trpc/server';
import { createMagicLinks, MagicLinkError, type MagicLinks } from '@facile/magiclink';
import type { PrismaClient } from '@repo/types';
import type { AuthManager } from '@repo/auth';
import { EmailTemplates, type SMTPClient } from '@repo/smtp';
import type { Logger } from '@repo/logger';
import {
  issueSession,
  loginBlockReason,
  loginGateSelection,
  sessionUserSelection,
  toSessionUser,
  type SessionMeta,
} from '../auth/session';
import { createPrismaMagicLinkStore } from './store';

export interface MagicLinkSettings {
  FRONTEND_URL: string;
  MAGIC_LINK_TTL_MINUTES: number;
  MAGIC_LINK_MAX_PER_EMAIL_HOUR: number;
  MAGIC_LINK_MAX_PER_IP_HOUR: number;
}

export interface MagicLinkContext {
  db: PrismaClient;
  env: MagicLinkSettings;
  getSmtp: () => Promise<SMTPClient>;
  log: Logger;
}

const UNLIMITED = { perEmail: Number.MAX_SAFE_INTEGER, perIp: Number.MAX_SAFE_INTEGER };

const REQUEST_FLOOR_MS = 150;

const INVALID_LINK = 'This link is invalid or has expired';

/**
 * An active, unblocked CLIENT of a platform studio space: the platform SMTP
 * mails only the studio's own clients (see space/studio.ts).
 */
const findEligibleClient = async (db: PrismaClient, email: string) => {
  const user = await db.user.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      role: 'CLIENT',
      status: 'ACTIVE',
      client: { is: { space: { is: { platformStudio: true } } } },
    },
    select: { id: true, email: true, ...loginGateSelection },
  });
  return user && !loginBlockReason(user) ? { id: user.id, email: user.email } : null;
};

const build = (ctx: MagicLinkContext, limits: { perEmail: number; perIp: number }, welcome: boolean) => {
  const found: { userId: string | null } = { userId: null };
  const links = createMagicLinks(
    {
      ttlMinutes: ctx.env.MAGIC_LINK_TTL_MINUTES,
      maxPerEmailPerHour: limits.perEmail,
      maxPerIpPerHour: limits.perIp,
    },
    {
      store: createPrismaMagicLinkStore(ctx.db),
      async findUserByEmail(email) {
        const user = await findEligibleClient(ctx.db, email);
        found.userId = user?.id ?? null;
        return user;
      },
      buildLink: (token) => `${ctx.env.FRONTEND_URL}/login/verify?token=${token}`,
      async send(to, link) {
        const smtp = await ctx.getSmtp();
        await new EmailTemplates(smtp).sendMagicLink({
          to,
          link,
          ttlMinutes: ctx.env.MAGIC_LINK_TTL_MINUTES,
          welcome,
        });
      },
      onSendError: (err) => ctx.log.error({ err }, 'Failed to send magic link email'),
    }
  );
  return { links, found };
};

const consumeLink = async (links: MagicLinks, token: string) => {
  try {
    return await links.consume(token);
  } catch (err) {
    if (err instanceof MagicLinkError) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: INVALID_LINK });
    }
    throw err;
  }
};

export const magicLinkService = {
  /**
   * Public request. Always resolves, whether or not the email belongs to an
   * eligible client. Rate limits come from the environment. The call takes at
   * least `floorMs`, so the extra writes done for a real client cannot be timed.
   */
  async request(ctx: MagicLinkContext, email: string, ip?: string, floorMs = REQUEST_FLOOR_MS) {
    const { links, found } = build(
      ctx,
      {
        perEmail: ctx.env.MAGIC_LINK_MAX_PER_EMAIL_HOUR,
        perIp: ctx.env.MAGIC_LINK_MAX_PER_IP_HOUR,
      },
      false
    );
    await Promise.all([links.request(email, { ip }), new Promise((done) => setTimeout(done, floorMs))]);
    ctx.log.info({ event: 'magic-link.request', userId: found.userId, ip, eligible: !!found.userId });
    return { ok: true as const };
  },

  /**
   * Welcome link sent when an admin creates a client. It skips the rate limit,
   * which exists for the public endpoint.
   */
  async sendWelcome(ctx: MagicLinkContext, email: string) {
    const { links } = build(ctx, UNLIMITED, true);
    await links.request(email);
  },

  /**
   * Turns a token into a session. The token is spent before the account checks,
   * so a banned or suspended client cannot reuse it either.
   */
  async consume(ctx: MagicLinkContext, auth: AuthManager, token: string, meta?: SessionMeta) {
    const { links } = build(ctx, UNLIMITED, false);

    let userId: string;
    try {
      ({ userId } = await consumeLink(links, token));
    } catch (err) {
      ctx.log.info({ event: 'magic-link.consume', outcome: 'invalid', ip: meta?.ipAddress });
      throw err;
    }

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { ...sessionUserSelection, ...loginGateSelection },
    });
    if (!user || user.role !== 'CLIENT') {
      ctx.log.info({ event: 'magic-link.consume', outcome: 'invalid', userId, ip: meta?.ipAddress });
      throw new TRPCError({ code: 'UNAUTHORIZED', message: INVALID_LINK });
    }

    const blocked = loginBlockReason(user);
    if (blocked || user.status !== 'ACTIVE') {
      ctx.log.info({ event: 'magic-link.consume', outcome: 'blocked', userId, ip: meta?.ipAddress });
      throw new TRPCError({ code: 'FORBIDDEN', message: blocked ?? 'This account is not active' });
    }

    ctx.log.info({ event: 'magic-link.consume', outcome: 'ok', userId, ip: meta?.ipAddress });
    return issueSession(ctx.db, auth, toSessionUser(user), meta);
  },
};

export default magicLinkService;
