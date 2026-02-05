import { z } from 'zod';

export const adminListOptionsSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filters: z.record(z.any()).optional(),
});

export const adminGetSchema = z.object({
  entity: z.string(),
  id: z.string(),
});

export const adminCreateSchema = z.object({
  entity: z.string(),
  data: z.any(),
});

export const adminUpdateSchema = z.object({
  entity: z.string(),
  id: z.string(),
  data: z.any(),
});

export const adminDeleteSchema = z.object({
  entity: z.string(),
  id: z.string(),
});

export const adminListSchema = z.object({
  entity: z.string(),
  options: adminListOptionsSchema.optional(),
});

export const adminGetPermissionsSchema = z.object({
  entity: z.string(),
});

export const adminGetAuditLogsSchema = z.object({
  entity: z.string(),
  entityId: z.string(),
});

export const adminSetPermissionsSchema = z.object({
  userId: z.string(),
  entity: z.string(),
  permissions: z.object({
    canCreate: z.boolean(),
    canRead: z.boolean(),
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
  }),
});

export const adminGetAllAuditLogsSchema = z.object({
  entity: z.string().optional(),
  userId: z.string().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
