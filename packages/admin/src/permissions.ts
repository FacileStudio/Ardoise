import type { PrismaClient } from '@repo/database';
import type { EntityOperation, AdminPermissions, AdminContext } from './types';

export class PermissionService {
  constructor(private db: PrismaClient) {}

  async checkPermission(
    context: AdminContext,
    entity: string,
    operation: EntityOperation
  ): Promise<boolean> {
    if (context.role === 'ADMIN') {
      return true;
    }

    const permission = await this.db.adminPermission.findUnique({
      where: {
        userId_entity: {
          userId: context.userId,
          entity,
        },
      },
    });

    if (!permission) {
      return false;
    }

    const operationMap = {
      create: permission.canCreate,
      read: permission.canRead,
      update: permission.canUpdate,
      delete: permission.canDelete,
    };

    return operationMap[operation] || false;
  }

  async getEntityPermissions(
    context: AdminContext,
    entity: string
  ): Promise<AdminPermissions> {
    if (context.role === 'ADMIN') {
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      };
    }

    const permission = await this.db.adminPermission.findUnique({
      where: {
        userId_entity: {
          userId: context.userId,
          entity,
        },
      },
    });

    if (!permission) {
      return {
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDelete: false,
      };
    }

    return {
      canCreate: permission.canCreate,
      canRead: permission.canRead,
      canUpdate: permission.canUpdate,
      canDelete: permission.canDelete,
    };
  }

  async setEntityPermissions(
    userId: string,
    entity: string,
    permissions: AdminPermissions
  ): Promise<void> {
    await this.db.adminPermission.upsert({
      where: {
        userId_entity: {
          userId,
          entity,
        },
      },
      create: {
        userId,
        entity,
        ...permissions,
      },
      update: permissions,
    });
  }

  async revokeEntityPermissions(userId: string, entity: string): Promise<void> {
    await this.db.adminPermission.delete({
      where: {
        userId_entity: {
          userId,
          entity,
        },
      },
    });
  }

  async getAllUserPermissions(userId: string) {
    return this.db.adminPermission.findMany({
      where: { userId },
    });
  }

  async requirePermission(
    context: AdminContext,
    entity: string,
    operation: EntityOperation
  ): Promise<void> {
    const hasPermission = await this.checkPermission(context, entity, operation);
    if (!hasPermission) {
      throw new Error(
        `Permission denied: User ${context.userId} cannot ${operation} ${entity}`
      );
    }
  }
}
