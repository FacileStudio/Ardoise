import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user@localhost:5432/charles';

async function createAdmin() {
  const email = 'admin@example.com';
  const password = 'admin123456789';
  const firstName = 'Yann';
  const lastName = 'Admin';

  if (!process.env.ENCRYPTION_SECRET) {
    throw new Error('ENCRYPTION_SECRET environment variable is required');
  }
  const encryptionSecret = process.env.ENCRYPTION_SECRET;
  const auth = new AuthManager({ encryptionSecret });

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log('✅ User already exists:', email);

    const passwordHash = await auth.hashPassword(password);
    await prisma.user.update({
      where: { email },
      data: {
        password: passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
      },
    });
    console.log('✅ Updated user to ADMIN with new password');
    return;
  }

  const passwordHash = await auth.hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      firstName,
      lastName,
      role: 'ADMIN',
      emailVerified: true,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password);
  console.log('👤 Name:', `${firstName} ${lastName}`);
  console.log('🎯 Role: ADMIN');
}

createAdmin()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  });
