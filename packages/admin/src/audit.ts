import type { PrismaClient } from '@repo/database';
import type { AuditLogEntry } from './types';

export class AuditService {
  constructor(private db: PrismaClient) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.db.auditLog.create({
      data: {
        userId: entry.userId,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      },
    });
  }

  async getEntityLogs(entity: string, entityId: string) {
    return this.db.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getUserLogs(userId: string, limit = 100) {
    return this.db.auditLog.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async getAllLogs(options: {
    entity?: string;
    userId?: string;
    action?: 'CREATE' | 'UPDATE' | 'DELETE';
    limit?: number;
    offset?: number;
  } = {}) {
    const { entity, userId, action, limit = 100, offset = 0 } = options;

    return this.db.auditLog.findMany({
      where: {
        ...(entity && { entity }),
        ...(userId && { userId }),
        ...(action && { action }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  }

  async countLogs(options: {
    entity?: string;
    userId?: string;
    action?: 'CREATE' | 'UPDATE' | 'DELETE';
  } = {}) {
    const { entity, userId, action } = options;

    return this.db.auditLog.count({
      where: {
        ...(entity && { entity }),
        ...(userId && { userId }),
        ...(action && { action }),
      },
    });
  }
}
