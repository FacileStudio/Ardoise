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
  BACKOFFICE_URL: z.string().url().optional(),

  ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 characters'),

  STORAGE_PATH: z.string().min(1).default('./data/uploads'),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  OIDC_ISSUER: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  OIDC_REDIRECT_URL: z.string().url().optional(),
  OIDC_SUCCESS_URL: z.string().url().optional(),
  SSO_ONLY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
