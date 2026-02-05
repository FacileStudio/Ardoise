import type { PrismaClient } from '@repo/database';
import { AdminEngine, PermissionService, AuditService } from '@repo/admin';
import type { EntityConfig, AdminContext } from '@repo/admin';
import { UserCreateInputSchema, UserUpdateInputSchema } from '@repo/database/zod';

export class AdminService {
  private engines: Map<string, AdminEngine> = new Map();
  private permissionService: PermissionService;
  private auditService: AuditService;

  constructor(private db: PrismaClient) {
    this.permissionService = new PermissionService(db);
    this.auditService = new AuditService(db);
    this.registerEntities();
  }

  private registerEntities() {
    this.registerEntity({
      name: 'user',
      displayName: 'User',
      schema: {
        create: UserCreateInputSchema,
        update: UserUpdateInputSchema,
      },
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'firstName', label: 'First Name', type: 'string', required: true },
        { name: 'lastName', label: 'Last Name', type: 'string', required: true },
        {
          name: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: [
            { value: 'USER', label: 'User' },
            { value: 'ADMIN', label: 'Admin' },
          ],
        },
        { name: 'isPremium', label: 'Premium', type: 'boolean' },
        { name: 'emailVerified', label: 'Email Verified', type: 'boolean' },
      ],
      listFields: ['email', 'firstName', 'lastName', 'role', 'createdAt'],
      searchFields: ['email', 'firstName', 'lastName'],
      defaultSort: { field: 'createdAt', order: 'desc' },
    });

    this.registerEntity({
      name: 'contact',
      displayName: 'Contact',
      schema: {
        create: UserCreateInputSchema,
        update: UserUpdateInputSchema,
      },
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'firstName', label: 'First Name', type: 'string', required: true },
        { name: 'lastName', label: 'Last Name', type: 'string', required: true },
      ],
      listFields: ['email', 'firstName', 'lastName', 'createdAt'],
      searchFields: ['email', 'firstName', 'lastName'],
      defaultSort: { field: 'createdAt', order: 'desc' },
    });

    this.registerEntity({
      name: 'media',
      displayName: 'Media',
      schema: {
        create: UserCreateInputSchema,
        update: UserUpdateInputSchema,
      },
      fields: [
        { name: 'url', label: 'URL', type: 'string', required: true },
        { name: 'key', label: 'Key', type: 'string', required: true },
        { name: 'mimeType', label: 'MIME Type', type: 'string', required: true },
        { name: 'size', label: 'Size (bytes)', type: 'number', required: true },
      ],
      listFields: ['url', 'mimeType', 'size', 'createdAt'],
      searchFields: ['key', 'mimeType'],
      defaultSort: { field: 'createdAt', order: 'desc' },
    });

    this.registerEntity({
      name: 'subscription',
      displayName: 'Subscription',
      schema: {
        create: UserCreateInputSchema,
        update: UserUpdateInputSchema,
      },
      fields: [
        { name: 'stripeCustomerId', label: 'Stripe Customer ID', type: 'string' },
        { name: 'stripeSubscriptionId', label: 'Stripe Subscription ID', type: 'string' },
        { name: 'status', label: 'Status', type: 'string' },
        { name: 'planId', label: 'Plan ID', type: 'string' },
        { name: 'currentPeriodEnd', label: 'Current Period End', type: 'date' },
        { name: 'cancelAtPeriodEnd', label: 'Cancel at Period End', type: 'boolean' },
      ],
      listFields: ['stripeCustomerId', 'status', 'planId', 'currentPeriodEnd'],
      searchFields: ['stripeCustomerId', 'stripeSubscriptionId'],
      defaultSort: { field: 'createdAt', order: 'desc' },
    });
  }

  private registerEntity(config: EntityConfig) {
    const delegate = (this.db as any)[config.name];
    if (!delegate) {
      throw new Error(`Entity "${config.name}" not found in Prisma client`);
    }
    const engine = new AdminEngine(this.db, config, delegate);
    this.engines.set(config.name, engine);
  }

  getEngine(entity: string): AdminEngine {
    const engine = this.engines.get(entity);
    if (!engine) {
      throw new Error(`Entity "${entity}" not registered`);
    }
    return engine;
  }

  getAvailableEntities(): string[] {
    return Array.from(this.engines.keys());
  }

  getEntityConfig(entity: string) {
    return this.getEngine(entity).getConfig();
  }

  async getAllAuditLogs(options: {
    entity?: string;
    userId?: string;
    action?: 'CREATE' | 'UPDATE' | 'DELETE';
    limit?: number;
    offset?: number;
  }) {
    return this.auditService.getAllLogs(options);
  }

  async setPermissions(
    userId: string,
    entity: string,
    permissions: {
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    }
  ) {
    return this.permissionService.setEntityPermissions(userId, entity, permissions);
  }

  async getUserPermissions(userId: string) {
    return this.permissionService.getAllUserPermissions(userId);
  }
}
