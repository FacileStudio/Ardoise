import { router, adminProcedure } from '../../trpc';
import { AdminService } from './service';
import {
  adminListSchema,
  adminGetSchema,
  adminCreateSchema,
  adminUpdateSchema,
  adminDeleteSchema,
  adminGetPermissionsSchema,
  adminGetAuditLogsSchema,
  adminSetPermissionsSchema,
  adminGetAllAuditLogsSchema,
} from './types';

export const adminRouter = router({
  getEntities: adminProcedure.query(async ({ ctx }) => {
    const service = new AdminService(ctx.db);
    return service.getAvailableEntities();
  }),

  getEntityConfig: adminProcedure.input(adminGetPermissionsSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    return service.getEntityConfig(input.entity);
  }),

  list: adminProcedure.input(adminListSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.list(context, input.options);
  }),

  get: adminProcedure.input(adminGetSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.get(context, input.id);
  }),

  create: adminProcedure.input(adminCreateSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.create(context, input.data);
  }),

  update: adminProcedure.input(adminUpdateSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.update(context, input.id, input.data);
  }),

  delete: adminProcedure.input(adminDeleteSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.delete(context, input.id);
  }),

  getPermissions: adminProcedure.input(adminGetPermissionsSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.getPermissions(context);
  }),

  setPermissions: adminProcedure
    .input(adminSetPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AdminService(ctx.db);
      return service.setPermissions(input.userId, input.entity, input.permissions);
    }),

  getUserPermissions: adminProcedure
    .input(adminGetPermissionsSchema)
    .query(async ({ ctx, input }) => {
      const service = new AdminService(ctx.db);
      return service.getUserPermissions(input.entity);
    }),

  getAuditLogs: adminProcedure.input(adminGetAuditLogsSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.getAuditLogs(context, input.entityId);
  }),

  getAllAuditLogs: adminProcedure
    .input(adminGetAllAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const service = new AdminService(ctx.db);
      return service.getAllAuditLogs(input);
    }),
});
