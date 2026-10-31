import { mkdir, stat, unlink, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, resolve, sep } from 'node:path';
import { existsSync } from 'node:fs';
export { createStorageTicket, verifyStorageTicket } from './ticket';

export interface StorageConfig {
  storagePath: string;
  publicUrl: string;
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
    const root = resolve(this.storagePath);
    const full = resolve(join(root, clean));
    if (full !== root && !full.startsWith(root + sep)) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async upload(path: string, data: ArrayBuffer | Uint8Array | Buffer, _contentType?: string): Promise<string> {
    const filePath = this.resolvePath(path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, new Uint8Array(data as ArrayBuffer));
    return this.getFileUrl(path);
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

  getFileUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.publicUrl}/storage/${cleanPath}`;
  }

  async download(path: string): Promise<Uint8Array> {
    const filePath = this.resolvePath(path);
    const buffer = await readFile(filePath);
    return new Uint8Array(buffer);
  }

  async ping(): Promise<void> {
    await mkdir(this.storagePath, { recursive: true });
    await stat(this.storagePath);
  }
}
