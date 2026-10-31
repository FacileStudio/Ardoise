import { describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import mediaService, { safeFileName } from './service';

function fixtures(existing: { key: string } | null) {
  const deleted: string[] = [];
  const storage = { delete: async (key: string) => deleted.push(key) } as unknown as StorageService;
  const media = {
    findUnique: async () => existing,
    upsert: async (args: any) => args,
  };
  const db = { media, user: { findUnique: async () => ({ id: 'u1' }) } } as unknown as PrismaClient;
  return { db, storage, deleted };
}

describe('safeFileName', () => {
  it('drops directories and traversal', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('a/../../b.png')).toBe('b.png');
    expect(safeFileName('..\\..\\x.png')).toBe('x.png');
  });

  it('keeps URL-breaking characters out of the key', () => {
    expect(safeFileName('my file?#.png')).toBe('my_file_.png');
    expect(safeFileName('...')).toBe('file');
  });
});

describe('mediaService.generateUploadUrl', () => {
  it('keeps the key under the caller upload folder', async () => {
    const result = await mediaService.generateUploadUrl(
      'u1',
      { fileName: '../../x/../../../evil.png', fileType: 'image/png' },
      'http://api.test',
      'secret-secret-secret-secret-secret-1'
    );

    expect(result.fileKey).toMatch(/^uploads\/u1\/\d+-evil\.png$/);
  });
});

describe('mediaService.updateUserAvatar', () => {
  const url = 'http://api.test/storage/uploads/u1/1-a.png';

  it('refuses a key outside the caller folder', async () => {
    const { db, storage } = fixtures(null);

    for (const key of ['receipts/p1.pdf', 'uploads/u2/1-a.png', 'uploads/u1/../u2/a.png', '../../etc/x']) {
      await expect(
        mediaService.updateUserAvatar(db, storage, 'u1', { url, key, size: 1 })
      ).rejects.toThrow();
    }
  });

  it('refuses a url that points elsewhere than the key', async () => {
    const { db, storage } = fixtures(null);

    await expect(
      mediaService.updateUserAvatar(db, storage, 'u1', {
        url: 'http://api.test/storage/uploads/u1/other.png',
        key: 'uploads/u1/1-a.png',
        size: 1,
      })
    ).rejects.toThrow();
  });

  it('deletes the previous file only when it is a different file', async () => {
    const same = fixtures({ key: 'uploads/u1/1-a.png' });
    await mediaService.updateUserAvatar(same.db, same.storage, 'u1', { url, key: 'uploads/u1/1-a.png', size: 1 });
    expect(same.deleted).toEqual([]);

    const other = fixtures({ key: 'uploads/u1/0-old.png' });
    await mediaService.updateUserAvatar(other.db, other.storage, 'u1', { url, key: 'uploads/u1/1-a.png', size: 1 });
    expect(other.deleted).toEqual(['uploads/u1/0-old.png']);
  });
});
