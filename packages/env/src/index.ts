import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const publicEnvSchema = baseSchema.extend({
  API_URL: z.string().url().optional(),
});

export const serverEnvSchema = baseSchema.extend({
  PORT: z.coerce.number(),
  TRUSTED_ORIGINS: z.string().transform((s) => s.split(',').map((u) => u.trim())),

  ENCRYPTION_SECRET: z.string().min(1),

  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),
  MINIO_BUCKET_NAME: z.string().min(1),
  MINIO_ENDPOINT: z.string().url(),
  MINIO_PUBLIC_URL: z.string().url(),

  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  LOGO_PATH: z.string().optional(),

  DOCUSEAL_API_URL: z.string().url().optional(),
  DOCUSEAL_API_KEY: z.string().min(1).optional(),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_FIRST_NAME: z.string().min(1).default('Admin'),
  ADMIN_LAST_NAME: z.string().min(1).default('User'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
