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

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

export const publicEnvSchema = baseSchema.extend({
  API_URL: z.string().url().optional(),
});

export const serverEnvSchema = baseSchema.extend({
  PORT: z.coerce.number().default(3001),
  BACKEND_URL: urlSchema('http://localhost:3001'),
  FRONTEND_URL: urlSchema('http://localhost:3000'),

  ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 characters'),

  STORAGE_PATH: z.string().min(1).default('./data/uploads'),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  COOKIE_DOMAIN: optionalString,

  OIDC_ISSUER: optionalUrl,
  OIDC_CLIENT_ID: optionalString,
  OIDC_CLIENT_SECRET: optionalString,
  OIDC_REDIRECT_URL: optionalUrl,
  OIDC_SUCCESS_URL: optionalUrl,
}).superRefine((env, ctx) => {
  if (env.OIDC_ISSUER && (!env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OIDC_CLIENT_ID'],
      message: 'OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are required when OIDC_ISSUER is set',
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
