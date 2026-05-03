import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

const urlSchema = (fallback: string) =>
  z
    .string()
    .url()
    .default(fallback)
    .transform((url) => url.replace(/\/$/, ''));

export const publicEnvSchema = baseSchema.extend({
  API_URL: z.string().url().optional(),
});

export const serverEnvSchema = baseSchema.extend({
  PORT: z.coerce.number().default(3001),
  BACKEND_URL: urlSchema('http://localhost:3001'),
  FRONTEND_URL: urlSchema('http://localhost:3000'),
  BACKOFFICE_URL: urlSchema('http://localhost:3002'),

  ENCRYPTION_SECRET: z.string().min(1),

  MINIO_ROOT_USER: z.string().min(1).default('minioadmin'),
  MINIO_ROOT_PASSWORD: z.string().min(1).default('minioadminpassword'),
  MINIO_BUCKET_NAME: z.string().min(1).default('charles-uploads'),
  MINIO_ENDPOINT: z.string().url().default('http://minio:9000'),
  MINIO_PUBLIC_URL: z.string().url().optional(),

  DISCORD_WEBHOOK_URL: z.string().url().optional(),

  LOGO_PATH: z.string().optional(),

  DOCUSEAL_API_URL: z.string().url().optional(),
  DOCUSEAL_API_KEY: z.string().min(1).optional(),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
