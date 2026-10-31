import { describe, expect, it } from 'bun:test';
import { isPrivate } from './avatar';

describe('isPrivate', () => {
  it('flags loopback, private, link-local and carrier-grade ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fd00::1', 'fe80::1']) {
      expect(isPrivate(ip)).toBe(true);
    }
  });

  it('flags IPv4-mapped IPv6 addresses', () => {
    expect(isPrivate('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivate('::ffff:7f00:1')).toBe(true);
  });

  it('allows public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111']) {
      expect(isPrivate(ip)).toBe(false);
    }
  });
});
