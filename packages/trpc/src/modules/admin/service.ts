import type { PrismaClient } from '@repo/database';
import { AdminEngine, PermissionService, AuditService } from '@repo/admin';
import type { EntityConfig } from '@repo/admin';
import { z } from 'zod';

const name = z.string().trim().min(1).max(200);

/**
 * The only user fields the generic admin engine may write. Identity and
 * privilege fields (email, emailVerified, role, status, bans, passwords,
 * accounts) are refused: staff come from Facile SSO and clients from
 * client.create, and billing staff are recognised by them.
 */
export const adminUserUpdateSchema = z
  .object({ firstName: name.optional(), lastName: name.optional() })
  .strict();

const mediaFields = {
  url: z.string().trim().min(1).max(2048),
  key: z.string().trim().min(1).max(1024),
  mimeType: z.string().trim().min(1).max(200),
  size: z.number().int().min(0).max(1_000_000_000_000),
};

/** Media rows through the admin engine: scalar columns only, never the avatar or cover user relations. */
export const adminMediaCreateSchema = z.object(mediaFields).strict();

/** Media updates through the admin engine: the same scalar columns, all optional. */
export const adminMediaUpdateSchema = z.object(mediaFields).partial().strict();

/** The generic admin engine never creates users. */
export const adminUserCreateSchema = z
  .object({})
  .strict()
  .refine(() => false, { message: 'Users are created by Facile SSO or client.create' });

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
        create: adminUserCreateSchema,
        update: adminUserUpdateSchema,
      },
      fields: [
        { name: 'firstName', label: 'First Name', type: 'string', required: true },
        { name: 'lastName', label: 'Last Name', type: 'string', required: true },
      ],
      listFields: ['email', 'firstName', 'lastName', 'role', 'createdAt'],
      searchFields: ['email', 'firstName', 'lastName'],
      defaultSort: { field: 'createdAt', order: 'desc' },
      hiddenFields: ['password'],
    });

    this.registerEntity({
      name: 'media',
      displayName: 'Media',
      schema: {
        create: adminMediaCreateSchema,
        update: adminMediaUpdateSchema,
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
