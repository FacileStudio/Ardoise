import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { prisma } from '@repo/database';
import type { StorageService } from '@repo/storage';

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
};

const isPrivate = (ip: string) =>
  /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(ip) ||
  /^(::1$|fc|fd|fe80)/i.test(ip);

async function assertPublicHost(hostname: string) {
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (addresses.some((a) => isPrivate(a.address))) throw new Error('private address');
}

async function download(pictureUrl: string) {
  const url = new URL(pictureUrl);
  if (url.protocol !== 'https:') return null;
  await assertPublicHost(url.hostname);

  const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;

  const mimeType = (res.headers.get('content-type') ?? '').split(';')[0].trim();
  const extension = EXTENSIONS[mimeType];
  if (!extension) return null;

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) return null;
  return { buffer, mimeType, extension };
}

export async function adoptPicture(userId: string, pictureUrl: string, storage: StorageService) {
  const existing = await prisma.media.findUnique({ where: { avatarUserId: userId }, select: { id: true } });
  if (existing) return null;

  try {
    const file = await download(pictureUrl);
    if (!file) return null;

    const key = `uploads/${userId}/oidc-avatar-${Date.now()}${file.extension}`;
    await storage.upload(key, file.buffer, file.mimeType);
    const url = storage.getFileUrl(key);
    await prisma.media.create({
      data: { url, key, mimeType: file.mimeType, size: file.buffer.byteLength, avatarUserId: userId },
    });
    return url;
  } catch {
    return null;
  }
}
