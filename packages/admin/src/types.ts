import type { z } from 'zod';

export type EntityOperation = 'create' | 'read' | 'update' | 'delete';

export interface AdminPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface EntityConfig<TModel = any, TCreateInput = any, TUpdateInput = any> {
  name: string;
  displayName: string;
  schema: {
    create: z.ZodType<TCreateInput>;
    update: z.ZodType<TUpdateInput>;
  };
  fields: FieldConfig[];
  listFields: string[];
  searchFields?: string[];
  defaultSort?: { field: string; order: 'asc' | 'desc' };
}

export interface FieldConfig {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'select' | 'relation' | 'json';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  relation?: {
    entity: string;
    displayField: string;
  };
}

export interface AdminContext {
  userId: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogEntry {
  userId: string;
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
