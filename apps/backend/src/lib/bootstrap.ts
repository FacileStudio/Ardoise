import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';
import type { ServerEnv } from '@repo/env';
import { logger } from './logger';

export async function bootstrapAdmin(
  env: ServerEnv,
  authManager: AuthManager
): Promise<void> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: env.ADMIN_EMAIL },
    });
    const passwordHash = await authManager.hashPassword(env.ADMIN_PASSWORD);

    if (existingUser) {
      await prisma.user.update({
        where: { email: env.ADMIN_EMAIL },
        data: {
          password: passwordHash,
          firstName: env.ADMIN_FIRST_NAME,
          lastName: env.ADMIN_LAST_NAME,
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

    const admin = await prisma.user.create({
      data: {
        email: env.ADMIN_EMAIL,
        password: passwordHash,
        firstName: env.ADMIN_FIRST_NAME,
        lastName: env.ADMIN_LAST_NAME,
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
