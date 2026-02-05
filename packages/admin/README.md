# @repo/admin

Universal Admin Engine with auto-generated forms, tables, and granular permissions.

## Features

- **Universal Entity Management**: Single configuration drives CRUD operations for any Prisma model
- **Auto-Generated UI**: Forms and tables automatically generated from entity configuration
- **Granular Permissions**: Per-entity, per-operation permission system (create, read, update, delete)
- **Automatic Audit Logging**: All mutations are logged with user, timestamp, and change details
- **Type-Safe**: Full TypeScript support with Zod validation from Prisma schemas
- **Framework Agnostic Core**: Core engine works with any framework, includes Svelte UI components

## Installation

The package is already configured in this monorepo. For external use:

```bash
bun add @repo/admin @repo/database zod
```

## Architecture

### Core Components

1. **AdminEngine**: Universal CRUD engine for any entity
2. **PermissionService**: Handles granular permissions per entity
3. **AuditService**: Automatic audit logging for all mutations
4. **EntityConfig**: Type-safe configuration defining entity behavior

### Database Models

Two new Prisma models are added:

```prisma
model AdminPermission {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  entity      String
  canCreate   Boolean  @default(false)
  canRead     Boolean  @default(false)
  canUpdate   Boolean  @default(false)
  canDelete   Boolean  @default(false)

  @@unique([userId, entity])
}

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  entity      String
  entityId    String
  action      AuditAction
  changes     Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([entity, entityId])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}
```

## Usage

### Backend: Registering Entities

In `packages/trpc/src/modules/admin/service.ts`:

```typescript
import { AdminEngine } from '@repo/admin';
import { UserCreateInputSchema, UserUpdateInputSchema } from '@repo/database/zod';

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
        options: [
          { value: 'USER', label: 'User' },
          { value: 'ADMIN', label: 'Admin' },
        ]
      },
    ],
    listFields: ['email', 'firstName', 'lastName', 'role', 'createdAt'],
    searchFields: ['email', 'firstName', 'lastName'],
    defaultSort: { field: 'createdAt', order: 'desc' },
  });
}
```

### Frontend: Using Admin Routes

Access the admin interface at `/admin` in the backoffice app:

- `/admin` - Dashboard showing all registered entities
- `/admin/user` - User management interface
- `/admin/contact` - Contact management interface
- `/admin/[entity]` - Any registered entity

### API Endpoints (tRPC)

All admin operations are exposed via `trpc.admin.*`:

```typescript
trpc.admin.getEntities.query()
trpc.admin.getEntityConfig.query({ entity: 'user' })
trpc.admin.list.query({ entity: 'user', options: { page: 1 } })
trpc.admin.get.query({ entity: 'user', id: '123' })
trpc.admin.create.mutate({ entity: 'user', data: {...} })
trpc.admin.update.mutate({ entity: 'user', id: '123', data: {...} })
trpc.admin.delete.mutate({ entity: 'user', id: '123' })
trpc.admin.getPermissions.query({ entity: 'user' })
trpc.admin.setPermissions.mutate({ userId: '123', entity: 'user', permissions: {...} })
trpc.admin.getAuditLogs.query({ entity: 'user', entityId: '123' })
```

## Permission System

### Setting Permissions

Grant a user permissions for an entity:

```typescript
await trpc.admin.setPermissions.mutate({
  userId: 'user-123',
  entity: 'user',
  permissions: {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: false,
  }
});
```

### Permission Hierarchy

1. **ADMIN role**: Has all permissions on all entities (bypass permission checks)
2. **Specific permissions**: Per-user, per-entity granular control
3. **No permissions**: Default is no access

### Checking Permissions

Permissions are automatically checked in all admin procedures:

```typescript
await engine.list(context, options);
```

## Audit Logging

All mutations (create, update, delete) are automatically logged:

```typescript
{
  userId: "user-123",
  entity: "user",
  entityId: "user-456",
  action: "UPDATE",
  changes: {
    before: { email: "old@example.com" },
    after: { email: "new@example.com" }
  },
  ipAddress: "127.0.0.1",
  userAgent: "Mozilla/5.0...",
  createdAt: "2024-01-01T00:00:00Z"
}
```

### Viewing Audit Logs

```typescript
const logs = await trpc.admin.getAuditLogs.query({
  entity: 'user',
  entityId: 'user-456'
});

const allLogs = await trpc.admin.getAllAuditLogs.query({
  entity: 'user',
  action: 'DELETE',
  limit: 100
});
```

## Field Types

Supported field types for auto-forms:

- `string`: Text input
- `email`: Email input with validation
- `number`: Number input
- `boolean`: Checkbox
- `date`: Date picker
- `select`: Dropdown with options
- `json`: JSON textarea
- `relation`: Foreign key relationship (future)

## Entity Configuration

```typescript
interface EntityConfig {
  name: string;                    // Database model name
  displayName: string;             // Human-readable name
  schema: {
    create: z.ZodType;            // Zod schema for creation
    update: z.ZodType;            // Zod schema for updates
  };
  fields: FieldConfig[];          // Form field definitions
  listFields: string[];           // Columns to show in table
  searchFields?: string[];        // Fields to search by
  defaultSort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}
```

## Customization

### Adding Custom Entities

1. Define entity config in `AdminService.registerEntities()`
2. Import Zod schemas from `@repo/database/zod`
3. Entity will automatically appear in admin dashboard

### Custom Field Rendering

Override field rendering in AutoForm component by extending the field type system.

### Custom Permissions

Extend `PermissionService` for custom permission logic beyond CRUD operations.

## Security

- All operations require authentication (via `adminProcedure`)
- ADMIN role bypasses permission checks
- All mutations are logged for auditing
- IP address and user agent captured for security tracking

## Development

```bash
cd packages/admin
bun run type-check
```

## License

Part of the MonorepoBoilerplate project.
