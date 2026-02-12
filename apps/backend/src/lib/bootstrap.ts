import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';
import type { ServerEnv } from '@repo/env';

export async function bootstrapAdmin(
  env: ServerEnv,
  authManager: AuthManager
): Promise<void> {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: env.ADMIN_EMAIL },
    });

    if (existingUser) {
      console.log('⚡ Upgrading existing user to ADMIN:', env.ADMIN_EMAIL);
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
      console.log('✅ User upgraded to ADMIN successfully!');
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

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', `${admin.firstName} ${admin.lastName}`);
    console.log('🎯 Role:', admin.role);
  } catch (error) {
    console.error('❌ Failed to bootstrap admin user:', error);
    throw error;
  }
}
