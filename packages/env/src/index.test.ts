import { describe, expect, test } from 'bun:test';
import { serverEnvSchema } from './index';

const base = {
  NODE_ENV: 'test',
  ENCRYPTION_SECRET: 'x'.repeat(32),
  ADMIN_EMAIL: 'owner@example.test',
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

describe('SSO_ONLY env', () => {
  test('defaults to false and keeps ADMIN_PASSWORD required', () => {
    expect(failures({ ...base })).toEqual(['ADMIN_PASSWORD']);
    const ok = serverEnvSchema.parse({ ...base, ADMIN_PASSWORD: 'long-enough' });
    expect(ok.SSO_ONLY).toBe(false);
  });

  test.each(['true', '1', 'TRUE'])('parses %s as true', (value) => {
    const env = serverEnvSchema.parse({ ...base, ...oidc, SSO_ONLY: value });
    expect(env.SSO_ONLY).toBe(true);
  });

  test.each(['', 'false', '0'])('parses %s as false', (value) => {
    const env = serverEnvSchema.parse({ ...base, ADMIN_PASSWORD: 'long-enough', SSO_ONLY: value });
    expect(env.SSO_ONLY).toBe(false);
  });

  test('rejects an unknown boolean', () => {
    expect(failures({ ...base, ADMIN_PASSWORD: 'long-enough', SSO_ONLY: 'yes' })).toContain(
      'SSO_ONLY'
    );
  });

  test('refuses to boot without OIDC_ISSUER', () => {
    expect(failures({ ...base, SSO_ONLY: 'true' })).toEqual(['OIDC_ISSUER']);
  });

  test('ADMIN_PASSWORD is optional in SSO mode but still min 8 when present', () => {
    expect(failures({ ...base, ...oidc, SSO_ONLY: 'true' })).toEqual([]);
    expect(failures({ ...base, ...oidc, SSO_ONLY: 'true', ADMIN_PASSWORD: 'short' })).toEqual([
      'ADMIN_PASSWORD',
    ]);
  });

  test('ADMIN_MIGRATE_FROM must be an email, empty means unset', () => {
    const env = serverEnvSchema.parse({ ...base, ...oidc, SSO_ONLY: '1', ADMIN_MIGRATE_FROM: '' });
    expect(env.ADMIN_MIGRATE_FROM).toBeUndefined();
    expect(failures({ ...base, ...oidc, SSO_ONLY: '1', ADMIN_MIGRATE_FROM: 'nope' })).toEqual([
      'ADMIN_MIGRATE_FROM',
    ]);
  });
});

describe('magic link env', () => {
  test('defaults to 15 minutes, 5 per email and 20 per IP', () => {
    const env = serverEnvSchema.parse({ ...base, ADMIN_PASSWORD: 'long-enough' });
    expect([
      env.MAGIC_LINK_TTL_MINUTES,
      env.MAGIC_LINK_MAX_PER_EMAIL_HOUR,
      env.MAGIC_LINK_MAX_PER_IP_HOUR,
    ]).toEqual([15, 5, 20]);
  });

  test('rejects a zero lifetime', () => {
    expect(
      failures({ ...base, ADMIN_PASSWORD: 'long-enough', MAGIC_LINK_TTL_MINUTES: '0' })
    ).toContain('MAGIC_LINK_TTL_MINUTES');
  });
});

describe('glouton env', () => {
  const ok = { ...base, ADMIN_PASSWORD: 'long-enough' };
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
