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

const nuageKeys = ['NUAGE_URL', 'NUAGE_API_TOKEN', 'NUAGE_SPACE_FACILE_ID'] as const;
const plumeKeys = ['PLUME_URL', 'PLUME_API_TOKEN', 'PLUME_WEBHOOK_SECRET'] as const;
const gloutonKeys = ['GLOUTON_URL', 'GLOUTON_API_TOKEN', 'GLOUTON_WEBHOOK_SECRET'] as const;

export const publicEnvSchema = baseSchema.extend({
  API_URL: z.string().url().optional(),
});

export const serverEnvSchema = baseSchema.extend({
  PORT: z.coerce.number().default(3001),
  BACKEND_URL: urlSchema('http://localhost:3001'),
  FRONTEND_URL: urlSchema('http://localhost:3000'),

  ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 characters'),

  STORAGE_PATH: z.string().min(1).default('./data/uploads'),

  COOKIE_DOMAIN: optionalString,

  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  MAGIC_LINK_MAX_PER_EMAIL_HOUR: z.coerce.number().int().min(1).default(5),
  MAGIC_LINK_MAX_PER_IP_HOUR: z.coerce.number().int().min(1).default(20),

  OIDC_ISSUER: optionalUrl,
  OIDC_CLIENT_ID: optionalString,
  OIDC_CLIENT_SECRET: optionalString,
  OIDC_REDIRECT_URL: optionalUrl,
  OIDC_SUCCESS_URL: optionalUrl,

  NUAGE_URL: optionalUrl,
  NUAGE_API_TOKEN: optionalString,
  NUAGE_SPACE_FACILE_ID: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^fac_[0-9a-f]{24}$/, 'NUAGE_SPACE_FACILE_ID must be fac_ followed by 24 lowercase hex')
      .optional()
  ),
  NUAGE_SPACE_NAME: optionalString,

  PLUME_URL: optionalUrl,
  PLUME_API_TOKEN: optionalString,
  PLUME_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),

  GLOUTON_URL: optionalUrl,
  GLOUTON_API_TOKEN: optionalString,
  GLOUTON_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),

  BILLING_API_TOKEN: optionalString,
  BILLING_REDIRECT_ORIGINS: z.preprocess(
    emptyToUndefined,
    z.string().default('https://sso.facile.studio')
  ),
  BILLING_STAFF_SUBS: z.string().default(''),
  BILLING_STAFF_EMAILS: z.string().default(''),
  BILLING_SEED_COMP_SUBS: z.string().default(''),
  BILLING_SEED_ON_BOOT: z.preprocess(
    emptyToUndefined,
    z.enum(['true', 'false']).default('false').transform((value) => value === 'true')
  ),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.OIDC_ISSUER) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OIDC_ISSUER'],
      message: 'OIDC_ISSUER is required in production: staff sign in with Facile SSO only',
    });
  }

  if (env.OIDC_ISSUER && (!env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OIDC_CLIENT_ID'],
      message: 'OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are required when OIDC_ISSUER is set',
    });
  }

  const groups = [
    { keys: nuageKeys, prefix: 'NUAGE_*' },
    { keys: plumeKeys, prefix: 'PLUME_*' },
    { keys: gloutonKeys, prefix: 'GLOUTON_*' },
  ];
  for (const { keys, prefix } of groups) {
    const missing = keys.filter((key) => !env[key]);
    if (missing.length === 0 || missing.length === keys.length) continue;
    for (const key of missing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required when other ${prefix} variables are set`,
      });
    }
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
