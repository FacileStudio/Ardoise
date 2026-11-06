import { router, platformStaffProcedure } from '../../trpc';
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

/**
 * Every admin procedure is platform staff only (platformStaffProcedure), so the
 * engine runs with full rights for them; the caller's own role is never
 * consulted, since every SSO user is MEMBER.
 */
const ENGINE_ROLE = 'ADMIN';

export const adminRouter = router({
  settings: settingsRouter,

  getEntities: platformStaffProcedure.query(async ({ ctx }) => {
    const service = new AdminService(ctx.db);
    return service.getAvailableEntities();
  }),

  getEntityConfig: platformStaffProcedure.input(adminGetPermissionsSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    return service.getEntityConfig(input.entity);
  }),

  list: platformStaffProcedure.input(adminListSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ENGINE_ROLE,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.list(context, input.options);
  }),

  get: platformStaffProcedure.input(adminGetSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ENGINE_ROLE,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.get(context, input.id);
  }),

  create: platformStaffProcedure.input(adminCreateSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ENGINE_ROLE,
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

  update: platformStaffProcedure.input(adminUpdateSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ENGINE_ROLE,
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

  delete: platformStaffProcedure.input(adminDeleteSchema).mutation(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ENGINE_ROLE,
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

  getPermissions: platformStaffProcedure.input(adminGetPermissionsSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ENGINE_ROLE,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.getPermissions(context);
  }),

  setPermissions: platformStaffProcedure
    .input(adminSetPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AdminService(ctx.db);
      return service.setPermissions(input.userId, input.entity, input.permissions);
    }),

  getUserPermissions: platformStaffProcedure
    .input(adminGetPermissionsSchema)
    .query(async ({ ctx, input }) => {
      const service = new AdminService(ctx.db);
      return service.getUserPermissions(input.entity);
    }),

  getAuditLogs: platformStaffProcedure.input(adminGetAuditLogsSchema).query(async ({ ctx, input }) => {
    const service = new AdminService(ctx.db);
    const engine = service.getEngine(input.entity);

    const context = {
      userId: ctx.user!.id,
      role: ENGINE_ROLE,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    return engine.getAuditLogs(context, input.entityId);
  }),

  getAllAuditLogs: platformStaffProcedure
    .input(adminGetAllAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const service = new AdminService(ctx.db);
      return service.getAllAuditLogs(input);
    }),
});
