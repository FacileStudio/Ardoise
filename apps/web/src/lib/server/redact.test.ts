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

  it('hides the token of a pay link path', () => {
    const token = 'b'.repeat(43);

    expect(redactUrl(`https://app.test/pay/${token}?paid=1`)).not.toContain(token);
    expect(redactUrl(`/pay/${token}`)).toBe('/pay/[redacted]');
  });
});
