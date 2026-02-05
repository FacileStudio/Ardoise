import type { PrismaClient } from '@repo/database';
import { PermissionService } from './permissions';
import { AuditService } from './audit';
import type {
  EntityConfig,
  AdminContext,
  ListOptions,
  ListResult,
} from './types';

export class AdminEngine<TModel = any, TCreateInput = any, TUpdateInput = any> {
  private permissionService: PermissionService;
  private auditService: AuditService;

  constructor(
    private db: PrismaClient,
    private config: EntityConfig<TModel, TCreateInput, TUpdateInput>,
    private delegate: any
  ) {
    this.permissionService = new PermissionService(db);
    this.auditService = new AuditService(db);
  }

  async list(
    context: AdminContext,
    options: ListOptions = {}
  ): Promise<ListResult<TModel>> {
    await this.permissionService.requirePermission(
      context,
      this.config.name,
      'read'
    );

    const {
      page = 1,
      pageSize = 20,
      search,
      sortBy = this.config.defaultSort?.field || 'createdAt',
      sortOrder = this.config.defaultSort?.order || 'desc',
      filters = {},
    } = options;

    const skip = (page - 1) * pageSize;

    const where: any = { ...filters };

    if (search && this.config.searchFields && this.config.searchFields.length > 0) {
      where.OR = this.config.searchFields.map((field) => ({
        [field]: {
          contains: search,
          mode: 'insensitive',
        },
      }));
    }

    const [data, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.delegate.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(context: AdminContext, id: string): Promise<TModel | null> {
    await this.permissionService.requirePermission(
      context,
      this.config.name,
      'read'
    );

    return this.delegate.findUnique({ where: { id } });
  }

  async create(
    context: AdminContext,
    data: TCreateInput
  ): Promise<TModel> {
    await this.permissionService.requirePermission(
      context,
      this.config.name,
      'create'
    );

    const validatedData = this.config.schema.create.parse(data);

    const record = await this.delegate.create({
      data: validatedData,
    });

    await this.auditService.log({
      userId: context.userId,
      entity: this.config.name,
      entityId: record.id,
      action: 'CREATE',
      changes: validatedData,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return record;
  }

  async update(
    context: AdminContext,
    id: string,
    data: TUpdateInput
  ): Promise<TModel> {
    await this.permissionService.requirePermission(
      context,
      this.config.name,
      'update'
    );

    const validatedData = this.config.schema.update.parse(data);

    const before = await this.delegate.findUnique({ where: { id } });
    if (!before) {
      throw new Error(`${this.config.displayName} not found`);
    }

    const record = await this.delegate.update({
      where: { id },
      data: validatedData,
    });

    await this.auditService.log({
      userId: context.userId,
      entity: this.config.name,
      entityId: id,
      action: 'UPDATE',
      changes: {
        before,
        after: validatedData,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return record;
  }

  async delete(context: AdminContext, id: string): Promise<void> {
    await this.permissionService.requirePermission(
      context,
      this.config.name,
      'delete'
    );

    const before = await this.delegate.findUnique({ where: { id } });
    if (!before) {
      throw new Error(`${this.config.displayName} not found`);
    }

    await this.delegate.delete({ where: { id } });

    await this.auditService.log({
      userId: context.userId,
      entity: this.config.name,
      entityId: id,
      action: 'DELETE',
      changes: before,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  async getPermissions(context: AdminContext) {
    return this.permissionService.getEntityPermissions(context, this.config.name);
  }

  async getAuditLogs(context: AdminContext, entityId: string) {
    await this.permissionService.requirePermission(
      context,
      this.config.name,
      'read'
    );

    return this.auditService.getEntityLogs(this.config.name, entityId);
  }

  getConfig() {
    return this.config;
  }
}
