import { describe, expect, it } from 'bun:test';
import { clientIp } from './client-ip';

const EDGE = '172.69.10.4';

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

  it('skips the Cloudflare edge and private hops to reach the visitor', () => {
    expect(clientIp(`203.0.113.9, ${EDGE}`)).toBe('203.0.113.9');
    expect(clientIp(`203.0.113.9, ${EDGE}, 10.0.0.2`)).toBe('203.0.113.9');
    expect(clientIp('203.0.113.9, 2606:4700::1')).toBe('203.0.113.9');
  });

  it('does not let a pre-seeded entry beat the address Cloudflare appended', () => {
    expect(clientIp(`6.6.6.6, 203.0.113.9, ${EDGE}`)).toBe('203.0.113.9');
    expect(clientIp(`172.69.1.1, 203.0.113.9, ${EDGE}`)).toBe('203.0.113.9');
  });

  it('prefers CF-Connecting-IP only when the last hop is a Cloudflare edge', () => {
    expect(clientIp(`203.0.113.9, ${EDGE}`, undefined, '198.51.100.7')).toBe('198.51.100.7');
    expect(clientIp('203.0.113.9', undefined, '198.51.100.7')).toBe('203.0.113.9');
    expect(clientIp(`203.0.113.9, ${EDGE}`, undefined, 'not-an-ip')).toBe('203.0.113.9');
  });

  it('falls back to the first hop when every hop is trusted', () => {
    expect(clientIp('10.0.0.5, 10.0.0.2')).toBe('10.0.0.5');
  });
});
