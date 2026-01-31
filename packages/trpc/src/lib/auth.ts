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
      encryptedData: {
        type: 'string',
        required: true,
      },
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
      },
      isActive: {
        type: 'boolean',
        required: true,
        defaultValue: true,
      },
      name: {
        type: 'string',
        required: false,
      },
      image: {
        type: 'string',
        required: false,
      },
      hashedEmail: {
        type: 'string',
        required: true,
      },
      hashedPassword: {
        type: 'string',
        required: true,
      },
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    'your-super-secret-change-in-production',
  trustedOrigins: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001'],
});

export type Auth = typeof auth;
