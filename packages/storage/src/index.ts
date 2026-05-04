import { mkdir, readdir, stat, unlink, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { logger } from '@repo/logger';
export { createStorageTicket, verifyStorageTicket } from './ticket';

export interface StorageConfig {
  storagePath: string;
  publicUrl: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
}

export interface FileStat {
  size: number;
  lastModified: Date;
}

export class StorageService {
  private storagePath: string;
  private publicUrl: string;

  constructor(config: StorageConfig) {
    this.storagePath = config.storagePath;
    this.publicUrl = config.publicUrl.replace(/\/$/, '');
  }

  private resolvePath(key: string): string {
    const clean = key.startsWith('/') ? key.slice(1) : key;
    return join(this.storagePath, clean);
  }

  async upload(path: string, data: ArrayBuffer | Uint8Array | Buffer, _contentType?: string): Promise<string> {
    const filePath = this.resolvePath(path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, new Uint8Array(data as ArrayBuffer));
    return this.getFileUrl(path);
  }

  async stat(path: string): Promise<FileStat | null> {
    try {
      const filePath = this.resolvePath(path);
      const s = await stat(filePath);
      return { size: s.size, lastModified: s.mtime };
    } catch {
      return null;
    }
  }

  async delete(path: string): Promise<boolean> {
    try {
      const filePath = this.resolvePath(path);
      if (existsSync(filePath)) {
        await unlink(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    return existsSync(this.resolvePath(path));
  }

  getFileUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.publicUrl}/storage/${cleanPath}`;
  }

  async download(path: string): Promise<Uint8Array> {
    const filePath = this.resolvePath(path);
    const buffer = await readFile(filePath);
    return new Uint8Array(buffer);
  }

  async list(prefix?: string): Promise<StorageObject[]> {
    const objects: StorageObject[] = [];
    const dir = prefix ? this.resolvePath(prefix) : this.storagePath;

    try {
      await this.listRecursive(dir, prefix || '', objects);
    } catch (e) {
      logger.error({ err: e }, 'Storage list error');
    }
    return objects;
  }

  private async listRecursive(dir: string, prefix: string, objects: StorageObject[]): Promise<void> {
    if (!existsSync(dir)) return;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await this.listRecursive(join(dir, entry.name), key, objects);
      } else {
        const s = await stat(join(dir, entry.name));
        objects.push({ key, size: s.size, lastModified: s.mtime });
      }
    }
  }
}
