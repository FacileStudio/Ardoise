import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';
import type { ServerEnv } from '@repo/env';
import { logger } from './logger';

export async function bootstrapAdmin(
  env: ServerEnv,
  authManager: AuthManager
): Promise<void> {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      logger.info('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: env.ADMIN_EMAIL },
    });

    if (existingUser) {
      logger.info('⚡ Upgrading existing user to ADMIN:', env.ADMIN_EMAIL);
      const passwordHash = await authManager.hashPassword(env.ADMIN_PASSWORD);
      await prisma.user.update({
        where: { email: env.ADMIN_EMAIL },
        data: {
          password: passwordHash,
          role: 'ADMIN',
          emailVerified: true,
          status: 'ACTIVE',
        },
      });
      logger.info('✅ User upgraded to ADMIN successfully!');
      return;
    }

    const passwordHash = await authManager.hashPassword(env.ADMIN_PASSWORD);

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

    logger.info('✅ Admin user created successfully!');
    logger.info('📧 Email:', admin.email);
    logger.info('👤 Name:', `${admin.firstName} ${admin.lastName}`);
    logger.info('🎯 Role:', admin.role);
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: { driverAdapterError?: string } };
    if (prismaError?.code === 'P2021' || prismaError?.meta?.driverAdapterError === 'TableDoesNotExist') {
      logger.info('⏭️  Skipping admin bootstrap: Database tables not created yet');
      logger.info('📝 This is expected on first deployment - migrations will create tables first');
      return;
    }
    logger.error('❌ Failed to bootstrap admin user:', error);
    throw error;
  }
}
