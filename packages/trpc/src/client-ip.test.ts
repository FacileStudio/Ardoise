import { describe, expect, it } from 'bun:test';
import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('takes the entry the proxy appended, not the one the caller chose', () => {
    expect(clientIp('1.1.1.1, 203.0.113.9')).toBe('203.0.113.9');
    expect(clientIp(' 1.1.1.1 ,  2.2.2.2 , 203.0.113.9 ')).toBe('203.0.113.9');
  });

  it('uses the connection address when there is no proxy header', () => {
    expect(clientIp(undefined, '198.51.100.4')).toBe('198.51.100.4');
    expect(clientIp('', '198.51.100.4')).toBe('198.51.100.4');
    expect(clientIp(null)).toBeUndefined();
  });
});
