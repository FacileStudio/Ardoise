import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import { logger } from '@repo/logger';
import {
  PlumeError,
  checkAccount,
  deleteWebhook,
  plumeConfigFromEnv,
  registerWebhook,
  type PlumeConfig,
  type PlumeEnv,
} from '@repo/plume';
import { decryptSecretStrict, encryptSecret } from '../settings/service';
import { isPlatformStudio } from '../space/studio';

export const PLUME_WEBHOOK_PATH = '/webhooks/plume';

type PlumeAccountEnv = PlumeEnv & { BACKEND_URL?: string };

type Actor = { userId: string; ipAddress?: string; userAgent?: string };

const cleared = { plumeApiToken: null, plumeWebhookSecret: null, plumeWebhookId: null };

async function connectedAccount(db: PrismaClient, spaceId: string) {
  const row = await db.spaceSettings.findUnique({
    where: { spaceId },
    select: { plumeApiToken: true, plumeWebhookSecret: true, plumeWebhookId: true },
  });
  if (!row?.plumeApiToken || !row.plumeWebhookSecret) return null;
  return {
    token: decryptSecretStrict(row.plumeApiToken),
    webhookSecret: decryptSecretStrict(row.plumeWebhookSecret),
    webhookId: row.plumeWebhookId,
  };
}

/**
 * The Plume account a space signs with: the account its admins connected, or,
 * for a platform studio space without one, the platform account. Any other
 * space gets null, so no tenant contract ever lands in the platform's Plume.
 */
export async function plumeConfigForSpace(
  db: PrismaClient,
  env: PlumeEnv,
  spaceId: string
): Promise<PlumeConfig | null> {
  const platform = plumeConfigFromEnv(env);
  if (!platform) return null;
  const own = await connectedAccount(db, spaceId);
  if (own) return { url: platform.url, token: own.token, webhookSecret: own.webhookSecret };
  return (await isPlatformStudio(db, spaceId)) ? platform : null;
}

/**
 * The secrets a Plume event about a document of `spaceId` may be signed with:
 * the space's own webhook secret, plus the platform one for a platform studio
 * space, whose older contracts went through the platform account.
 */
export async function plumeWebhookSecretsFor(
  db: PrismaClient,
  env: PlumeEnv,
  spaceId: string
): Promise<string[]> {
  const platform = plumeConfigFromEnv(env);
  if (!platform) return [];
  const own = await connectedAccount(db, spaceId);
  const secrets = own ? [own.webhookSecret] : [];
  if (await isPlatformStudio(db, spaceId)) secrets.push(platform.webhookSecret);
  return secrets;
}

async function audit(db: PrismaClient, actor: Actor, spaceId: string, plume: string) {
  await db.auditLog.create({
    data: {
      userId: actor.userId,
      entity: 'spaceSettings',
      entityId: spaceId,
      action: 'UPDATE',
      changes: { plume },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    },
  });
}

async function forgetWebhook(url: string, account: { token: string; webhookId: string | null } | null) {
  if (!account?.webhookId) return;
  await deleteWebhook({ url, token: account.token }, account.webhookId).catch((error) =>
    logger.warn({ err: error }, 'Could not remove the Plume webhook')
  );
}

/**
 * Connects a space to the Plume account `token` belongs to: Ardoise checks
 * the token, registers its signed webhook in that account with a fresh secret,
 * and keeps both sealed. A previous connection is replaced.
 */
export async function connectPlume(
  db: PrismaClient,
  env: PlumeAccountEnv,
  actor: Actor,
  spaceId: string,
  token: string
): Promise<{ plumeConnected: true }> {
  const platform = plumeConfigFromEnv(env);
  if (!platform || !env.BACKEND_URL) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Plume is not configured on this server.' });
  }
  if (token === platform.token) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Use a token from your own Plume account.' });
  }
  const account = { url: platform.url, token };
  const secret = randomBytes(32).toString('hex');
  let webhookId: string;
  try {
    await checkAccount(account);
    webhookId = await registerWebhook(account, `${env.BACKEND_URL.replace(/\/$/, '')}${PLUME_WEBHOOK_PATH}`, secret);
  } catch (error) {
    if (!(error instanceof PlumeError)) throw error;
    const refused = error.status === 401 || error.status === 403;
    throw new TRPCError({
      code: refused ? 'BAD_REQUEST' : 'BAD_GATEWAY',
      message: refused ? 'Plume refused this token.' : `Could not reach Plume: ${error.message}`,
    });
  }
  await forgetWebhook(platform.url, await connectedAccount(db, spaceId));
  const data = { plumeApiToken: encryptSecret(token), plumeWebhookSecret: encryptSecret(secret), plumeWebhookId: webhookId };
  await db.spaceSettings.upsert({ where: { spaceId }, create: { spaceId, ...data }, update: data });
  await audit(db, actor, spaceId, 'connected');
  return { plumeConnected: true };
}

/** Disconnects a space from its Plume account and removes Ardoise's webhook there. */
export async function disconnectPlume(
  db: PrismaClient,
  env: PlumeEnv,
  actor: Actor,
  spaceId: string
): Promise<{ plumeConnected: false }> {
  const platform = plumeConfigFromEnv(env);
  const account = await connectedAccount(db, spaceId);
  if (platform) await forgetWebhook(platform.url, account);
  await db.spaceSettings.updateMany({ where: { spaceId }, data: cleared });
  await audit(db, actor, spaceId, 'disconnected');
  return { plumeConnected: false };
}
