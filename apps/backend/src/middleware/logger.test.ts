import { describe, expect, it } from 'bun:test';
import { redactUrl } from './logger.middleware';

describe('redactUrl', () => {
  it('hides storage tickets and OIDC codes', () => {
    const url = redactUrl('http://api/storage/uploads/u1/a.png?ticket=abc.def&x=1');
    expect(url).not.toContain('abc.def');
    expect(url).toContain('x=1');

    const callback = redactUrl('http://api/auth/oidc/callback?code=secret&state=other');
    expect(callback).not.toContain('secret');
    expect(callback).not.toContain('other');
  });

  it('leaves clean urls alone', () => {
    expect(redactUrl('http://api/health')).toBe('http://api/health');
  });
});
