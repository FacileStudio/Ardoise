import { S3Client, type S3Stats } from 'bun';

export type { S3Stats };

export interface StorageConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

export interface StorageObject {
  key: string;
  size: number;
  lastModified: Date;
  etag?: string;
}

export class StorageService {
  public client: S3Client;
  private publicUrl: string;

  constructor(config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
    });

    this.publicUrl = config.publicUrl || `${config.endpoint}/${config.bucket}`;
  }

  async upload(path: string, data: any, contentType?: string) {
    const s3File = this.client.file(path);
    await (s3File as any).write(data, {
      type: contentType,
    });
    return this.getFileUrl(path);
  }

  async stat(path: string): Promise<S3Stats | null> {
    try {
      return await this.client.file(path).stat();
    } catch {
      return null;
    }
  }

  async delete(path: string): Promise<boolean> {
    const s3File = this.client.file(path);
    if (await s3File.exists()) {
      await s3File.delete();
      return true;
    }
    return false;
  }

  async exists(path: string): Promise<boolean> {
    return await this.client.file(path).exists();
  }

  getFileUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const cleanBase = this.publicUrl.endsWith('/') ? this.publicUrl.slice(0, -1) : this.publicUrl;
    return `${cleanBase}/${cleanPath}`;
  }

  async download(path: string): Promise<Uint8Array> {
    return new Uint8Array(await this.client.file(path).arrayBuffer());
  }

  async list(prefix?: string): Promise<StorageObject[]> {
    const objects: StorageObject[] = [];
    try {
      const result = await (this.client.list({ prefix }) as any);

      for await (const object of result) {
        objects.push(object);
      }
    } catch (e) {
      console.error('Storage list error:', e);
    }
    return objects;
  }
}
