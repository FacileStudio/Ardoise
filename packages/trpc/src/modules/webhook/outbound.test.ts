import { describe, expect, it } from 'bun:test';
import { isPublicAddress, postToSpaceWebhook, resolveSafeTarget, UnsafeWebhookUrlError } from './outbound';

const publicHost = async () => ['93.184.216.34'];

describe('isPublicAddress', () => {
  it('accepts public addresses', () => {
    for (const address of ['93.184.216.34', '8.8.8.8', '2606:2800:220:1:248:1893:25c8:1946']) {
      expect(isPublicAddress(address)).toBe(true);
    }
  });

  it('refuses private, loopback, link-local, reserved and mapped addresses', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
      '::1',
      '::',
      'fe80::1',
      'fc00::1',
      'fd12:3456::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1',
      '::ffff:10.0.0.1',
      '64:ff9b::7f00:1',
      'not-an-ip',
    ]) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });
});

describe('resolveSafeTarget', () => {
  const refuses = async (url: string, resolver = publicHost) => {
    await expect(resolveSafeTarget(url, resolver)).rejects.toBeInstanceOf(UnsafeWebhookUrlError);
  };

  it('accepts an https URL that resolves to a public address', async () => {
    const target = await resolveSafeTarget('https://hooks.example.test/in?x=1', publicHost);
    expect(target.address).toBe('93.184.216.34');
    expect(target.family).toBe(4);
  });

  it('refuses anything but https, credentials and bad URLs', async () => {
    await refuses('http://hooks.example.test/in');
    await refuses('ftp://hooks.example.test/in');
    await refuses('https://user:pass@hooks.example.test/in');
    await refuses('not a url');
  });

  it('refuses IP literals that are private, however they are written', async () => {
    await refuses('https://127.0.0.1/in');
    await refuses('https://[::1]/in');
    await refuses('https://169.254.169.254/latest/meta-data');
    await refuses('https://2130706433/in');
    await refuses('https://0x7f.0.0.1/in');
    await refuses('https://[::ffff:127.0.0.1]/in');
  });

  it('refuses a name that resolves to a private address, even if another one is public', async () => {
    await refuses('https://internal.example.test/in', async () => ['10.0.0.5']);
    await refuses('https://rebind.example.test/in', async () => ['93.184.216.34', '127.0.0.1']);
    await refuses('https://localhost/in', async () => ['127.0.0.1', '::1']);
  });

  it('refuses a name that does not resolve', async () => {
    await refuses('https://nowhere.example.test/in', async () => {
      throw new Error('ENOTFOUND');
    });
    await refuses('https://empty.example.test/in', async () => []);
  });
});

describe('postToSpaceWebhook', () => {
  it('never reaches the transport for an unsafe target', async () => {
    let called = 0;
    const transport = async () => {
      called += 1;
      return 200;
    };

    await expect(
      postToSpaceWebhook('https://metadata.example.test/', {}, '{}', { resolver: async () => ['169.254.169.254'], transport })
    ).rejects.toBeInstanceOf(UnsafeWebhookUrlError);
    expect(called).toBe(0);
  });

  it('connects to the address it checked, not to a second DNS answer', async () => {
    const seen: string[] = [];
    const status = await postToSpaceWebhook('https://hooks.example.test/in', { a: 'b' }, '{}', {
      resolver: publicHost,
      transport: async (target) => {
        seen.push(target.address);
        return 204;
      },
    });

    expect(status).toBe(204);
    expect(seen).toEqual(['93.184.216.34']);
  });
});
