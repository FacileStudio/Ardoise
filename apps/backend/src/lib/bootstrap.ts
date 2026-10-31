import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';
import type { ServerEnv } from '@repo/env';
import type { PrismaClient } from '@repo/types';
import { logger } from './logger';

const DEFAULT_ADMIN_FIRST_NAME = 'Admin';
const DEFAULT_ADMIN_LAST_NAME = 'User';

export const UNUSABLE_PASSWORD = '!sso-only';

const findByEmail = (db: PrismaClient, email: string) =>
  db.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

/**
 * Moves the legacy admin to ADMIN_EMAIL, or disables it when ADMIN_EMAIL already
 * has an account. Touches only the account named by ADMIN_MIGRATE_FROM.
 */
async function migrateLegacyAdmin(db: PrismaClient, from: string, to: string) {
  const legacy = await findByEmail(db, from);
  if (!legacy || legacy.email.toLowerCase() === to.toLowerCase()) return;

  const target = await findByEmail(db, to);

  if (!target) {
    await db.$transaction([
      db.session.deleteMany({ where: { userId: legacy.id } }),
      db.user.update({
        where: { id: legacy.id },
        data: { email: to, password: UNUSABLE_PASSWORD },
      }),
    ]);
    logger.info({ userId: legacy.id, from: legacy.email, to }, 'Legacy admin moved to the SSO email');
    return;
  }

  if (legacy.isBanned && legacy.password === UNUSABLE_PASSWORD) return;

  await db.$transaction([
    db.session.deleteMany({ where: { userId: legacy.id } }),
    db.user.update({
      where: { id: legacy.id },
      data: {
        status: 'BANNED',
        isBanned: true,
        banReason: `Replaced by ${to} (SSO-only mode)`,
        bannedAt: new Date(),
        password: UNUSABLE_PASSWORD,
      },
    }),
  ]);
  logger.info({ userId: legacy.id, email: legacy.email }, 'Legacy admin disabled');
}

/**
 * SSO-only bootstrap: the admin has no password, exists with ADMIN_EMAIL and is
 * usable. Writes only when something differs, so reruns are no-ops.
 */
async function bootstrapSsoAdmin(db: PrismaClient, env: ServerEnv) {
  if (env.ADMIN_MIGRATE_FROM) await migrateLegacyAdmin(db, env.ADMIN_MIGRATE_FROM, env.ADMIN_EMAIL);

  const admin = await findByEmail(db, env.ADMIN_EMAIL);

  if (!admin) {
    await db.user.create({
      data: {
        email: env.ADMIN_EMAIL,
        password: UNUSABLE_PASSWORD,
        firstName: DEFAULT_ADMIN_FIRST_NAME,
        lastName: DEFAULT_ADMIN_LAST_NAME,
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    logger.info({ email: env.ADMIN_EMAIL }, 'SSO admin user created');
    return;
  }

  const sound =
    admin.role === 'ADMIN' &&
    admin.emailVerified &&
    admin.status === 'ACTIVE' &&
    !admin.isBanned &&
    !admin.isSuspended &&
    admin.password === UNUSABLE_PASSWORD;
  if (sound) return;

  await db.user.update({
    where: { id: admin.id },
    data: {
      password: UNUSABLE_PASSWORD,
      role: 'ADMIN',
      emailVerified: true,
      status: 'ACTIVE',
      isBanned: false,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
      isSuspended: false,
      suspendedUntil: null,
      suspensionReason: null,
    },
  });
  logger.info({ email: admin.email }, 'SSO admin user repaired');
}

export async function bootstrapAdmin(
  env: ServerEnv,
  authManager: AuthManager,
  db: PrismaClient = prisma
): Promise<void> {
  try {
    if (env.SSO_ONLY) {
      await bootstrapSsoAdmin(db, env);
      return;
    }

    const existingUser = await db.user.findUnique({
      where: { email: env.ADMIN_EMAIL },
    });
    const passwordHash = await authManager.hashPassword(env.ADMIN_PASSWORD!);

    if (existingUser) {
      await db.user.update({
        where: { email: env.ADMIN_EMAIL },
        data: {
          password: passwordHash,
          firstName: DEFAULT_ADMIN_FIRST_NAME,
          lastName: DEFAULT_ADMIN_LAST_NAME,
          role: 'ADMIN',
          emailVerified: true,
          status: 'ACTIVE',
          isBanned: false,
          banReason: null,
          bannedAt: null,
          bannedBy: null,
          isSuspended: false,
          suspendedUntil: null,
          suspensionReason: null,
        },
      });
      logger.info({ email: env.ADMIN_EMAIL }, 'Default admin user updated');
      return;
    }

    const admin = await db.user.create({
      data: {
        email: env.ADMIN_EMAIL,
        password: passwordHash,
        firstName: DEFAULT_ADMIN_FIRST_NAME,
        lastName: DEFAULT_ADMIN_LAST_NAME,
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    logger.info({ email: admin.email, role: admin.role }, 'Default admin user created');
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { driverAdapterError?: string } };
    if (prismaError?.code === 'P2021' || prismaError?.meta?.driverAdapterError === 'TableDoesNotExist') {
      logger.info('⏭️  Skipping admin bootstrap: Database tables not created yet');
      logger.info('📝 This is expected on first deployment - migrations will create tables first');
      return;
    }
    logger.error({ error }, '❌ Failed to bootstrap admin user');
    throw error;
  }
}
