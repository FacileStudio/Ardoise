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
