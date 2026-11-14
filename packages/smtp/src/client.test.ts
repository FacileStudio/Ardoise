import { describe, expect, test } from 'bun:test';
import { fromAddress, senderName } from './client';

describe('tenant sender', () => {
  test('keeps only the platform address of the configured From', () => {
    expect(fromAddress('"Facile Studio" <contact@facile.studio>')).toBe('contact@facile.studio');
    expect(fromAddress('contact@facile.studio')).toBe('contact@facile.studio');
  });

  test('strips header breaks and anything address-like from a display name', () => {
    expect(senderName('Acme\r\nBcc: victim@x.test <evil@x.test> via Ardoise')).toBe('Acme Bcc: victim x.test evil x.test via Ardoise');
    expect(senderName('  ')).toBe('Ardoise');
    expect(senderName('x'.repeat(200))).toHaveLength(78);
  });
});
