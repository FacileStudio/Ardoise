import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const publicEnvSchema = baseSchema.extend({
  API_URL: z.string().url(),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
});

export const serverEnvSchema = baseSchema.extend({
  PORT: z.coerce.number(),
  FRONTEND_URL: z.string().url(),
  TRUSTED_ORIGINS: z.string().transform((s) => s.split(',').map((u) => u.trim())),

  ENCRYPTION_SECRET: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),
  MINIO_BUCKET_NAME: z.string().min(1),
  MINIO_ENDPOINT: z.string().url(),
  MINIO_PUBLIC_URL: z.string().url(),

  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().min(1).max(65535),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),

  LOGO_PATH: z.string().optional(),

  DOCUSEAL_API_URL: z.string().url().optional(),
  DOCUSEAL_API_KEY: z.string().min(1).optional(),

  COMPANY_NAME: z.string().min(1),
  COMPANY_CONTACT_EMAIL: z.string().email(),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_FIRST_NAME: z.string().min(1),
  ADMIN_LAST_NAME: z.string().min(1),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  LOGTAIL_TOKEN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
