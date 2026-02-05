# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a tRPC-based monorepo boilerplate built with Turborepo, featuring:
- Full end-to-end type safety with tRPC
- Hono backend server running on Bun
- SvelteKit frontends (landing page + backoffice)
- Expo mobile app
- Custom authentication system (JWT-based)
- Stripe integration for payments
- MinIO S3-compatible storage
- Prisma ORM with PostgreSQL (multi-schema support)

## Package Manager

Use **Bun** exclusively for all package management and script execution.

## Development Commands

### Initial Setup
```bash
bun install
bun run dev:db:setup                     # Start PostgreSQL and push schema (recommended)

# Or run separately:
bun run dev:db                           # Start PostgreSQL and auto-configure .env files
cd packages/database && bun run db:push  # Push schema to database
```

**Note**: The `dev:db` script automatically:
- Starts PostgreSQL (via Docker or Homebrew)
- Creates the database if it doesn't exist
- Updates `DATABASE_URL` in `apps/backend/.env` and `packages/database/.env`

### Running Applications
```bash
bun run dev                              # Run all apps in parallel (Turborepo)
cd apps/backend && bun run dev           # Backend only (port 3001)
cd apps/frontend && bun run dev          # Frontend only (port 5173)
cd apps/backoffice && bun run dev        # Backoffice only (port 3002)
cd apps/mobile && bun run dev            # Expo dev server
cd apps/mobile && bun run ios            # iOS simulator
cd apps/mobile && bun run android        # Android emulator
```

### Database Operations
```bash
bun run dev:db                           # Start local PostgreSQL and auto-configure .env
bun run dev:db:setup                     # Start database + push schema (recommended)
bun run db:studio                        # Open Prisma Studio (from root)

cd packages/database
bun run db:generate                      # Generate Prisma client
bun run db:push                          # Push schema to database (dev)
bun run db:migrate:dev                   # Create and apply migration
bun run db:migrate:deploy                # Apply migrations (production)
bun run db:studio                        # Open Prisma Studio (from database package)
```

**Database Configuration**:
- The `dev:db` script detects your PostgreSQL installation (Docker or Homebrew)
- For Homebrew installations, it uses your macOS username (no password required)
- For Docker installations, it creates a container with credentials `postgres:postgres`
- The script automatically updates `DATABASE_URL` in both `apps/backend/.env` and `packages/database/.env`

### Build & Type Checking
```bash
bun run build                            # Build all apps (Turborepo)
bun run type-check                       # Type check all apps
turbo run type-check --filter=@repo/backend  # Type check specific app
```

### Linting & Formatting
```bash
bun run lint                             # Lint all apps
bun run format                           # Format with Prettier
```

### Environment Validation
```bash
cd apps/backend && bun run check-env     # Validate backend .env
cd apps/frontend && bun run check-env    # Validate frontend .env
```

## Architecture

### Monorepo Structure

- **`apps/`**: Independent applications
  - `backend`: Hono server with tRPC endpoints
  - `frontend`: SvelteKit landing page
  - `backoffice`: SvelteKit admin panel
  - `mobile`: Expo React Native app

- **`packages/`**: Shared libraries
  - `@repo/database`: Prisma schema and client
  - `@repo/trpc`: tRPC router, procedures, context (server-only)
  - `@repo/trpc-client`: Universal tRPC client factory for web/mobile (client-only)
  - `@repo/auth`: Custom JWT authentication (server-only)
  - `@repo/auth-shared`: Shared auth utilities
  - `@repo/storage`: MinIO S3 service (server-only)
  - `@repo/storage-client`: File upload utilities for browser/React Native (client-only)
  - `@repo/stripe`: Stripe integration
  - `@repo/env`: Zod environment validation
  - `@repo/types`: Shared TypeScript types
  - `@repo/crypto`: Encryption utilities
  - `@repo/i18n`: Internationalization with Svelte and React hooks
  - `@repo/ui`: Shared Svelte components
  - `@repo/utils`: Shared utility functions
  - `@repo/tsconfig`: Shared TypeScript configs

### tRPC Architecture

The tRPC setup follows a clean client/server separation:

**Server-side (`@repo/trpc`):**
The tRPC router is organized into **modular routers** located in `packages/trpc/src/modules/`:

- `auth`: Authentication (login, register, verify)
- `user`: User management
- `contact`: Contact form submissions
- `stripe`: Payment processing
- `media`: File uploads to S3
- `chat`: Messaging system

**Key files:**
- `packages/trpc/src/index.ts`: Main router combining all module routers (exports `AppRouter` type)
- `packages/trpc/src/trpc.ts`: Procedure definitions (public, protected, admin)
- `packages/trpc/src/context.ts`: tRPC context with auth, db, storage, stripe

**Procedures:**
- `publicProcedure`: No authentication required
- `protectedProcedure`: Requires valid JWT token
- `adminProcedure`: Requires admin role

**Module structure pattern:**
```
packages/trpc/src/modules/[module]/
  ├── router.ts      # tRPC router definition
  └── service.ts     # Business logic
```

**Client-side (`@repo/trpc-client`):**
Universal client factory compatible with SvelteKit, React Native, and any JavaScript environment:

```typescript
import { createUniversalTrpcClient } from '@repo/trpc-client';

const trpc = createUniversalTrpcClient({
  baseUrl: 'https://api.example.com/trpc',
  getToken: () => getAuthToken(),
  onUnauthorized: () => redirectToLogin()
});
```

Features:
- Type-safe proxy client using `AppRouter` type from `@repo/trpc`
- Automatic JWT token injection via `Authorization: Bearer` header
- Batch request support via `httpBatchLink`
- Custom 401 handling with `onUnauthorized` callback
- Works in browser, Node.js, and React Native

### Backend Entry Point

The backend (`apps/backend/src/index.ts`) initializes:
1. `AuthManager` - JWT token management
2. `StorageService` - MinIO client
3. `StripeService` - Stripe API client
4. Hono app with CORS, logging middleware
5. Stripe webhook handler at `/webhook`
6. tRPC handler at `/trpc/*`

### Environment Variables

Environment schemas are defined in `packages/env/src/index.ts`:
- `serverEnvSchema`: Backend-only variables (JWT secrets, Stripe keys, MinIO credentials)
- `publicEnvSchema`: Frontend-safe variables (API URLs)

Each app validates its environment on startup via `check-env` script using Zod.

**Required backend variables:**
- `ENCRYPTION_SECRET`: JWT encryption key
- `STRIPE_SECRET_KEY`: Stripe API key (must start with `sk_`)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret (must start with `whsec_`)
- `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET_NAME`
- `FRONTEND_URL`: For CORS
- `TRUSTED_ORIGINS`: Comma-separated allowed origins

See `apps/backend/.env.example` for complete reference.

### Prisma Multi-Schema Setup

Prisma schema is split into multiple files in `packages/database/prisma/schema/`:
- `base.prisma`: Database config (PostgreSQL)
- `user.prisma`, `account.prisma`, `session.prisma`: Auth models
- `contact.prisma`, `stripe.prisma`, `media.prisma`, etc.: Feature models

All schemas are automatically merged by Prisma.

**Development database:**
- Run `bun run dev:db` to start and configure a local PostgreSQL instance
- Database URL is configured via `DATABASE_URL` environment variable
- Default: `postgresql://fangafunk@localhost:5432/myapp`

**Production database:**
- Set `DATABASE_URL` in production environment to your PostgreSQL connection string
- Use `bun run db:migrate:deploy` to apply migrations

### Authentication Flow

Custom JWT-based authentication (not Better Auth):
1. User registers/logs in via `auth` tRPC router
2. Backend returns JWT token signed with `ENCRYPTION_SECRET`
3. Clients store token (localStorage for web, SecureStore for mobile)
4. Token sent in `Authorization: Bearer <token>` header
5. `createContext` verifies token and attaches user to context
6. Protected procedures check `ctx.user` via middleware

Authorization uses role-based access control via `@repo/auth-shared/hasAccess`.

### Stripe Integration

Stripe is integrated for payments:
- `packages/stripe`: Service wrapper around Stripe SDK
- `packages/trpc/src/modules/stripe`: tRPC router for checkout, subscriptions
- `apps/backend/src/handlers/stripe.ts`: Webhook handler for events
- Webhook endpoint: `POST /webhook` (validates signature with `STRIPE_WEBHOOK_SECRET`)

### Storage (S3/MinIO)

File uploads use MinIO (S3-compatible) with a clean client/server separation:

**Server-side (`@repo/storage`):**
- Bun S3Client wrapper for MinIO operations
- Generates pre-signed URLs for secure uploads
- Handles file deletion and metadata
- Used only in backend/tRPC context

**Client-side (`@repo/storage-client`):**
- Browser and React Native compatible upload functions
- `uploadFile(file, presignedUrl, options)`: Upload with progress tracking via XMLHttpRequest
- `uploadFileSimple(file, presignedUrl)`: Simple fetch-based upload
- Type-safe error handling with `UploadError`
- No server dependencies or credentials

**Upload flow:**
1. Client requests pre-signed URL via `trpc.media.getUploadUrl.mutate()`
2. Server generates pre-signed URL (valid 15 minutes) with `storage.client.file(key).presign()`
3. Client uploads directly to S3 using `@repo/storage-client`
4. Client confirms upload via tRPC mutation (e.g., `media.updateAvatar`)

**Configuration:**
- Configured via `MINIO_*` environment variables
- See `packages/trpc/src/modules/media/router.ts` for endpoints

### Internationalization (i18n)

The boilerplate includes a universal i18n system compatible with both SvelteKit and React Native:

**Package (`@repo/i18n`):**
- Type-safe translations with autocomplete
- Nested translation keys (`common.buttons.save`)
- Interpolation support (`{{variable}}`)
- Automatic browser locale detection
- localStorage persistence
- Zero runtime dependencies

**Supported locales:**
- `en` - English (default)
- `fr` - French

**SvelteKit usage:**
```typescript
import { i18n } from '@repo/i18n/svelte';

// In template
{$i18n.t('auth.login.title')}

// Change locale
i18n.setLocale('fr');
```

**React Native usage:**
```typescript
import { useI18n } from '@repo/i18n/react';

const { t, locale, setLocale } = useI18n();

// In component
<Text>{t('auth.login.title')}</Text>

// Change locale
setLocale('fr');
```

**Adding translations:**
1. Add to `packages/i18n/src/locales/en.ts` (source of truth)
2. Add to `packages/i18n/src/locales/fr.ts` (TypeScript enforces same structure)
3. Use via `t('your.new.key')`

**Adding new locales:**
See `packages/i18n/README.md` for detailed instructions.

## Development Patterns

### Adding a New tRPC Module

1. Create module directory: `packages/trpc/src/modules/[module]/`
2. Create `service.ts` with business logic
3. Create `router.ts` with tRPC procedures
4. Import and add to `appRouter` in `packages/trpc/src/index.ts`

Example:
```typescript
// packages/trpc/src/modules/todo/router.ts
import { router, publicProcedure } from '../../trpc';
import { z } from 'zod';

export const todoRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.todo.findMany();
  }),
  create: publicProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.todo.create({ data: input });
    }),
});

// packages/trpc/src/index.ts
import { todoRouter } from './modules/todo/router';

export const appRouter = router({
  // ...existing routers
  todo: todoRouter,
});
```

### Adding a Prisma Model

1. Create new schema file in `packages/database/prisma/schema/[model].prisma`
2. Define model (it will auto-merge with base config)
3. Run `bun run db:push` or `bun run db:migrate:dev`
4. Prisma client auto-regenerates with new model

### Adding Environment Variables

1. Add to schema in `packages/env/src/index.ts`
2. Update `.env.example` in relevant app(s)
3. `check-env` script will validate on startup

## Testing

Currently no test infrastructure is set up (see TODO.md).

## Turborepo Task Dependencies

Defined in `turbo.json`:
- `build`: Depends on `db:generate` and `check-env`
- `dev`: Depends on `db:generate` and `check-env`
- `type-check`: Depends on `db:generate`

This ensures Prisma client is generated before builds/dev runs.

## Known Issues & TODOs

See `TODO.md` for planned features including:
- Email verification and password reset
- OAuth (Google, GitHub)
- 2FA
- Redis caching
- Cron jobs
- Testing infrastructure
- Internationalization
- Multi-tenant support
