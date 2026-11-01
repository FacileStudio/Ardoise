import { describe, expect, it } from 'bun:test';
import { redactUrl } from './redact';

describe('redactUrl', () => {
  it('hides a magic link token', () => {
    const token = 'a'.repeat(64);
    const out = redactUrl(`https://app.test/login/verify?token=${token}&x=1`);

    expect(out).not.toContain(token);
    expect(out).toContain('x=1');
  });

  it('drops the query of a value it cannot parse', () => {
    expect(redactUrl('/login/verify?token=secret')).toBe('/login/verify');
  });
});
