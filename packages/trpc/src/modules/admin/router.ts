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
import { settingsRouter } from '../settings/router';
import { dispatchConfiguredWebhook } from '../webhook/service';
import { TRPCError } from '@trpc/server';
import { ZodError } from 'zod';

/** Turns a rejected admin payload into BAD_REQUEST instead of a 500. */
async function validated<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'These fields cannot be written here', cause: error });
    }
    throw error;
  }
}

export const adminRouter = router({
  settings: settingsRouter,

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

    const record = await validated(() => engine.create(context, input.data));

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: `admin.${input.entity}.created`,
      actor: {
        id: ctx.user!.id,
        email: ctx.user!.email,
        role: ctx.user!.role,
      },
      data: {
        entity: input.entity,
        record,
      },
    });

    return record;
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

    const record = await validated(() => engine.update(context, input.id, input.data));

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: `admin.${input.entity}.updated`,
      actor: {
        id: ctx.user!.id,
        email: ctx.user!.email,
        role: ctx.user!.role,
      },
      data: {
        entity: input.entity,
        entityId: input.id,
        record,
      },
    });

    return record;
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

    await engine.delete(context, input.id);

    await dispatchConfiguredWebhook({
      db: ctx.db,
      log: ctx.log,
      event: `admin.${input.entity}.deleted`,
      actor: {
        id: ctx.user!.id,
        email: ctx.user!.email,
        role: ctx.user!.role,
      },
      data: {
        entity: input.entity,
        entityId: input.id,
      },
    });
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
