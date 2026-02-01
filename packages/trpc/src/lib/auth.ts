import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@repo/database';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: ['admin', 'user'],
        required: true,
        defaultValue: 'user',
        input: false,
      },
      isPremium: {
        type: 'boolean',
        required: true,
        defaultValue: false,
        input: false,
      },
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    'your-super-secret-change-in-production',
  trustedOrigins: [
    process.env.TRUSTED_ORIGINS || 'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3000',
  ],
});

export type Auth = typeof auth;
