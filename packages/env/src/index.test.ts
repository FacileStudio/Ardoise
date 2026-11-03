import { describe, expect, test } from 'bun:test';
import { serverEnvSchema } from './index';

const base = {
  NODE_ENV: 'test',
  ENCRYPTION_SECRET: 'x'.repeat(32),
};

const oidc = {
  OIDC_ISSUER: 'https://sso.example.test',
  OIDC_CLIENT_ID: 'ardoise',
  OIDC_CLIENT_SECRET: 'secret',
};

const failures = (input: Record<string, unknown>) => {
  const result = serverEnvSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('OIDC env', () => {
  test('is optional outside production', () => {
    expect(failures({ ...base })).toEqual([]);
  });

  test('refuses to boot in production without OIDC_ISSUER', () => {
    expect(failures({ ...base, NODE_ENV: 'production' })).toEqual(['OIDC_ISSUER']);
    expect(failures({ ...base, ...oidc, NODE_ENV: 'production' })).toEqual([]);
  });
});

describe('magic link env', () => {
  test('defaults to 15 minutes, 5 per email and 20 per IP', () => {
    const env = serverEnvSchema.parse({ ...base });
    expect([
      env.MAGIC_LINK_TTL_MINUTES,
      env.MAGIC_LINK_MAX_PER_EMAIL_HOUR,
      env.MAGIC_LINK_MAX_PER_IP_HOUR,
    ]).toEqual([15, 5, 20]);
  });

  test('rejects a zero lifetime', () => {
    expect(
      failures({ ...base, MAGIC_LINK_TTL_MINUTES: '0' })
    ).toContain('MAGIC_LINK_TTL_MINUTES');
  });
});

describe('glouton env', () => {
  const ok = { ...base };
  const glouton = {
    GLOUTON_URL: 'https://glouton.example.test',
    GLOUTON_API_TOKEN: 'token',
    GLOUTON_WEBHOOK_SECRET: 's'.repeat(16),
  };

  test('is optional and all or nothing', () => {
    expect(failures(ok)).toEqual([]);
    expect(failures({ ...ok, ...glouton })).toEqual([]);
    expect(failures({ ...ok, GLOUTON_URL: glouton.GLOUTON_URL })).toEqual([
      'GLOUTON_API_TOKEN',
      'GLOUTON_WEBHOOK_SECRET',
    ]);
  });

  test('needs a webhook secret of at least 16 characters', () => {
    expect(failures({ ...ok, ...glouton, GLOUTON_WEBHOOK_SECRET: 'short' })).toEqual([
      'GLOUTON_WEBHOOK_SECRET',
    ]);
  });
});
