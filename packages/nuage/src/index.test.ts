import { describe, expect, test } from 'bun:test';
import { nuageConfigFromEnv, storeContractInNuage } from './index';

describe('nuage contract archive', () => {
  test('is disabled unless url, token and space are all set', () => {
    expect(nuageConfigFromEnv({ NUAGE_URL: 'https://n.test' })).toBeNull();
    const config = nuageConfigFromEnv({
      NUAGE_URL: 'https://n.test/',
      NUAGE_API_TOKEN: 't',
      NUAGE_SPACE_FACILE_ID: 'fac_000000000000000000000000',
    });
    expect(config?.url).toBe('https://n.test');
    expect(config?.spaceName).toBe('Ardoise');
  });

  test('never throws when Nuage is unreachable', async () => {
    const config = nuageConfigFromEnv({
      NUAGE_URL: 'http://127.0.0.1:1',
      NUAGE_API_TOKEN: 't',
      NUAGE_SPACE_FACILE_ID: 'fac_000000000000000000000000',
    });
    await expect(
      storeContractInNuage(config, { filename: 'a.pdf', pdf: new Uint8Array([1]), linkedTo: 'x' })
    ).resolves.toBeUndefined();
  });
});
