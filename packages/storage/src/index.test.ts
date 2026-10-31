import { afterAll, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageService } from './index';

const root = mkdtempSync(join(tmpdir(), 'storage-'));
const storage = new StorageService({ storagePath: join(root, 'data'), publicUrl: 'http://x' });

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('StorageService key handling', () => {
  it('round-trips a normal key', async () => {
    await storage.upload('uploads/u1/a.txt', new TextEncoder().encode('hi'));
    expect(new TextDecoder().decode(await storage.download('uploads/u1/a.txt'))).toBe('hi');
  });

  it('refuses keys that climb out of the storage root', async () => {
    for (const key of ['../outside.txt', 'uploads/../../outside.txt', '/../outside.txt']) {
      await expect(storage.upload(key, new Uint8Array([1]))).rejects.toThrow('Invalid storage key');
      await expect(storage.download(key)).rejects.toThrow('Invalid storage key');
      expect(await storage.delete(key)).toBe(false);
    }
  });

  it('refuses a sibling directory that shares the root prefix', async () => {
    await expect(storage.upload('../data-evil/x.txt', new Uint8Array([1]))).rejects.toThrow();
  });
});
