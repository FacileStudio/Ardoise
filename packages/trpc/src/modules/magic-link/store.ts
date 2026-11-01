import type { MagicLinkStore } from '@facile/magiclink';
import type { PrismaClient } from '@repo/types';

export const createPrismaMagicLinkStore = (db: PrismaClient): MagicLinkStore => ({
  async create({ userId, tokenHash, expiresAt, ip }) {
    await db.magicLink.create({ data: { userId, tokenHash, expiresAt, ipAddress: ip } });
  },

  async invalidateForUser(userId) {
    await db.magicLink.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  },

  async consume(tokenHash, now) {
    const claimed = await db.magicLink.updateMany({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) return null;

    const link = await db.magicLink.findUnique({ where: { tokenHash }, select: { userId: true } });
    return link ? { userId: link.userId } : null;
  },

  async countSince({ userId, ip }, since) {
    return db.magicLink.count({
      where: {
        createdAt: { gte: since },
        ...(userId === undefined ? {} : { userId }),
        ...(ip === undefined ? {} : { ipAddress: ip }),
      },
    });
  },
});
