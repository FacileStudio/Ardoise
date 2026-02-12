# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Charles** is a payment and invoicing platform for Facile Studio. This is an internal tool (not for public use) that allows Facile Studio to:
- Send payment requests to clients
- Track payment status (pending, paid, expired, cancelled)
- Manage client information and company settings
- Generate invoices with Stripe integration
- Send automated payment reminder emails via SMTP

This is a tRPC-based monorepo built with Turborepo, featuring:
- Full end-to-end type safety with tRPC
- Hono backend server running on Bun
- SvelteKit frontend (client portal + landing page)
- SvelteKit backoffice (admin panel for Facile Studio)
- Custom authentication system (JWT-based with AuthManager)
- Stripe integration for secure payments
- MinIO S3-compatible storage
- Prisma ORM with PostgreSQL (multi-schema support)
- SMTP email notifications
- Typst document generation (placeholder)

## Package Manager

Use **Bun** exclusively for all package management and script execution.

## Development Commands

### Quick Start with Justfile

The project includes a `justfile` for common tasks:

```bash
just init              # Complete setup: install, generate, createdb, push schema
just create-admin      # Create admin account (yann@facile.studio / testcaca123) for local dev
just dev               # Run all apps (backend + frontend + backoffice)
just backend           # Run backend only (port 3001)
just frontend          # Run frontend only (port 5173)
just backoffice        # Run backoffice only (port 3002)
just generate          # Generate Prisma client
just push              # Push schema to database (dev)
just studio            # Open Prisma Studio
just typecheck         # Type check all apps
just lint              # Lint all apps
just format            # Format with Prettier
just build             # Build all apps
```

**Recommended first-time setup:**
```bash
just init              # Install dependencies, generate Prisma client, create database, push schema
just create-admin      # Create admin account for testing
just dev               # Start all servers
```

### Initial Setup (Alternative Method)
```bash
bun install
bun run dev:db:setup                     # Start PostgreSQL and push schema (recommended)

# Or run separately:
bun run dev:db                           # Start PostgreSQL and auto-configure .env files
cd packages/database && bun run db:push  # Push schema to database
```

**Note**: The `dev:db` script automatically:
- Starts PostgreSQL (via Docker or Homebrew)
- Creates the `charles` database if it doesn't exist
- Updates `DATABASE_URL` in `apps/backend/.env` and `packages/database/.env`

### Running Applications
```bash
bun run dev                              # Run all apps in parallel (Turborepo)
cd apps/backend && bun run dev           # Backend only (port 3001)
cd apps/frontend && bun run dev          # Frontend only (port 5173)
cd apps/backoffice && bun run dev        # Backoffice only (port 3002)
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
  - `backend`: Hono server with tRPC endpoints (port 3001)
  - `frontend`: SvelteKit client portal and landing page (port 5173)
  - `backoffice`: SvelteKit admin panel for Facile Studio (port 3002)

- **`packages/`**: Shared libraries
  - `@repo/database`: Prisma schema and client (with browser/server conditional exports)
  - `@repo/trpc`: tRPC router, procedures, context (server-only)
  - `@repo/trpc-client`: Universal tRPC client factory for web (client-only)
  - `@repo/auth`: Custom JWT authentication with AuthManager (server-only)
  - `@repo/auth-shared`: Shared auth utilities
  - `@repo/storage`: MinIO S3 service (server-only)
  - `@repo/storage-client`: File upload utilities for browser (client-only)
  - `@repo/stripe`: Stripe integration
  - `@repo/smtp`: Email notifications (server-only)
  - `@repo/typst`: Document generation with Typst (placeholder)
  - `@repo/env`: Zod environment validation
  - `@repo/types`: Shared TypeScript types
  - `@repo/crypto`: Encryption utilities
  - `@repo/i18n`: Internationalization with Svelte hooks
  - `@repo/ui`: Shared Svelte components with AutoForm/AutoTable
  - `@repo/utils`: Shared utility functions
  - `@repo/tsconfig`: Shared TypeScript configs

### tRPC Architecture

The tRPC setup follows a clean client/server separation:

**Server-side (`@repo/trpc`):**
The tRPC router is organized into **modular routers** located in `packages/trpc/src/modules/`:

- `auth`: Authentication (login, register, verify)
- `user`: User management
- `client`: Client CRUD operations (company info, billing address)
- `payment`: Payment requests, status tracking, Stripe integration
- `settings`: Company settings (logo, bank details, TVA, contact info)
- `document`: Document generation with Typst (placeholder)
- `media`: File uploads to S3/MinIO
- `admin`: Admin operations and entity management (AutoTable/AutoForm)
- `stripe`: Legacy Stripe operations (mostly replaced by payment module)

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
Universal client factory compatible with SvelteKit and any JavaScript environment:

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
- Works in browser and Node.js

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
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://fangafunk@localhost:5432/charles`)
- `ENCRYPTION_SECRET`: JWT encryption key (32+ characters)
- `STRIPE_SECRET_KEY`: Stripe API key (must start with `sk_`)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret (must start with `whsec_`)
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (must start with `pk_`)
- `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `COMPANY_NAME`: Company name for documents (e.g., `Facile Studio`)
- `COMPANY_CONTACT_EMAIL`: Contact email for documents (e.g., `contact@facile.studio`)
- `ADMIN_EMAIL`: Default admin email (e.g., `admin@facile.studio`)
- `ADMIN_PASSWORD`: Default admin password (minimum 8 characters)
- `ADMIN_FIRST_NAME`: Default admin first name
- `ADMIN_LAST_NAME`: Default admin last name
- `FRONTEND_URL`: Frontend URL for CORS (e.g., `http://localhost:5173`)
- `TRUSTED_ORIGINS`: Comma-separated allowed origins (e.g., `http://localhost:5173,http://localhost:3001,http://localhost:3002`)
- `PORT`: Backend server port (default: 3001)

**Optional backend variables:**
- `DOCUSEAL_API_URL`: DocuSeal instance URL (e.g., `https://docuseal.example.com/api`)
- `DOCUSEAL_API_KEY`: DocuSeal API key for document signing
- `LOGO_PATH`: Path to company logo for PDFs
- `DISCORD_WEBHOOK_URL`: Discord webhook for notifications
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `LOGTAIL_TOKEN`: Logtail token for remote logging

**Required frontend variables:**
- `PORT`: Frontend server port (default: 5173)
- `VITE_API_URL`: Backend API URL (e.g., `http://localhost:3001`)
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (must start with `pk_`)
- `NODE_ENV`: Environment (development/production)

**Required backoffice variables:**
- `PORT`: Backoffice server port (default: 3002)
- `VITE_API_URL`: Backend API URL (e.g., `http://localhost:3001`)
- `NODE_ENV`: Environment (development/production)

See `apps/backend/.env.example` and `apps/frontend/.env` for complete reference.

### Prisma Multi-Schema Setup

Prisma schema is split into multiple files in `packages/database/prisma/schema/`:
- `base.prisma`: Database config (PostgreSQL)
- `user.prisma`, `account.prisma`, `session.prisma`: Auth models
- `stripe.prisma`, `media.prisma`, etc.: Feature models

All schemas are automatically merged by Prisma.

**Charles-specific Prisma models:**
- `Client`: Client information (companyName, SIRET, billing address, etc.)
- `Payment`: Payment requests with Stripe integration (amount, status, dueDate, frequency)
- `Settings`: Company configuration (singleton model for logo, bank details, TVA rate)

**Development database:**
- Run `bun run dev:db` or `just init` to start and configure a local PostgreSQL instance
- Database name: `charles`
- Database URL is configured via `DATABASE_URL` environment variable
- Default: `postgresql://fangafunk@localhost:5432/charles`

**Production database:**
- Set `DATABASE_URL` in production environment to your PostgreSQL connection string
- Use `bun run db:migrate:deploy` to apply migrations

**Creating admin account:**

The backend automatically creates an admin user on first startup if none exists. Admin credentials are configured via environment variables:

**Required environment variables:**
- `ADMIN_EMAIL`: Admin email address
- `ADMIN_PASSWORD`: Admin password (minimum 8 characters)
- `ADMIN_FIRST_NAME`: Admin first name
- `ADMIN_LAST_NAME`: Admin last name

**Local development:**
```bash
# Already configured in apps/backend/.env
just dev  # Admin is created automatically on first startup
```

**Production/Railway:**
Set the admin environment variables in Railway dashboard, and the admin will be created automatically when the backend starts.

**Behavior:**
- ✅ Creates admin user if no admin exists (runs on every startup)
- ⚠️  Skips if an admin already exists (safe to run repeatedly)
- ⚡ Upgrades existing non-admin user to admin if email matches

The bootstrap logic uses `AuthManager.hashPassword()` to ensure password compatibility with the backend authentication system.

### Authentication Flow

Custom JWT-based authentication using `AuthManager` from `@repo/auth`:
1. User logs in via `auth.login` tRPC router
2. Backend verifies password with `AuthManager.verifyPassword()` (uses Argon2/scrypt via CryptoService)
3. Backend returns JWT token signed with `ENCRYPTION_SECRET`
4. Clients store token (localStorage for web)
5. Token sent in `Authorization: Bearer <token>` header
6. `createContext` verifies token with `AuthManager.verifyToken()` and attaches user to context
7. Protected procedures check `ctx.user` via middleware

Authorization uses role-based access control via `@repo/auth-shared/hasAccess`.

**Important**: Always use `AuthManager.hashPassword()` when creating users (e.g., in seed scripts or admin creation). Never use bcrypt directly as it's incompatible with the backend's authentication system.

### Stripe Integration

Stripe is integrated for client payments in Charles:
- `packages/stripe`: Service wrapper around Stripe SDK
- `packages/trpc/src/modules/payment`: Payment creation, status tracking, Stripe checkout
- `apps/backend/src/handlers/stripe.ts`: Webhook handler for payment status updates
- Webhook endpoint: `POST /webhook` (validates signature with `STRIPE_WEBHOOK_SECRET`)

**Payment flow:**
1. Admin creates payment in backoffice via `payment.create.mutate()`
2. Backend automatically sends payment email to client via SMTP
3. Client receives email with payment link (`/app/payment/[id]`)
4. Client enters payment page and clicks "Payer maintenant"
5. Frontend calls `payment.getClientSecret.mutate()` to get Stripe checkout session
6. Client completes payment via Stripe Elements
7. Stripe webhook updates payment status to PAID
8. Receipt becomes available for download

**Environment variables:**
- `STRIPE_SECRET_KEY`: Stripe API key (must start with `sk_`)
- `STRIPE_WEBHOOK_SECRET`: Webhook signature secret (must start with `whsec_`)
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`: Client-side publishable key (must start with `pk_`)

### Storage (S3/MinIO)

File uploads use MinIO (S3-compatible) with a clean client/server separation:

**Server-side (`@repo/storage`):**
- Bun S3Client wrapper for MinIO operations
- Generates pre-signed URLs for secure uploads
- Handles file deletion and metadata
- Used only in backend/tRPC context

**Client-side (`@repo/storage-client`):**
- Browser-compatible upload functions
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

### Email Notifications (SMTP)

Email notifications are sent automatically when payments are created:
- `packages/smtp`: SMTP service wrapper
- `packages/trpc/src/modules/payment`: Sends payment emails on creation
- Uses Nodemailer under the hood

**Email flow:**
1. Admin creates payment in backoffice
2. Backend calls SMTP service to send payment notification
3. Client receives email with payment link and details
4. Email includes company logo and branding

**Environment variables:**
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (usually 587 or 465)
- `SMTP_USER`: SMTP username
- `SMTP_PASSWORD`: SMTP password
- `SMTP_FROM_EMAIL`: Sender email address
- `SMTP_FROM_NAME`: Sender display name

### Internationalization (i18n)

The application includes a type-safe i18n system for SvelteKit:

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

**Adding translations:**
1. Add to `packages/i18n/src/locales/en.ts` (source of truth)
2. Add to `packages/i18n/src/locales/fr.ts` (TypeScript enforces same structure)
3. Use via `t('your.new.key')`

**Adding new locales:**
See `packages/i18n/README.md` for detailed instructions.

### Browser/Server Conditional Exports

The `@repo/database` package uses conditional exports to avoid importing Node.js modules (like `pg`) in the browser:

**Configuration** (`packages/database/package.json`):
```json
{
  "exports": {
    ".": {
      "browser": "./src/browser.ts",
      "default": "./src/index.ts"
    }
  }
}
```

**Browser stub** (`packages/database/src/browser.ts`):
- Exports null stub for `prisma` to prevent server imports
- Re-exports types only (UserRole, Prisma types)

**Vite configuration** (in frontend/backoffice):
- `optimizeDeps.exclude`: Exclude `@repo/database`, `@prisma/client`, `pg`
- `ssr.noExternal`: Include client-only packages for SSR

This prevents "Buffer is not defined" and other Node.js module errors in the browser.

### Frontend Application Structure

**Landing page** (`apps/frontend/src/routes/+page.svelte`):
- Internal tool presentation (no public signup)
- Login button redirects to `/login`
- Color scheme: #FAF7F5 (beige), #291334 (purple), #FEC129 (yellow)
- Logo: `/logo.svg` (LogoCharles.svg) + "Charles" text

**Client dashboard** (`apps/frontend/src/routes/app/+page.svelte`):
- Lists all client payments grouped by status (PENDING, PAID, EXPIRED, CANCELLED)
- "Payer maintenant" button for pending payments
- Receipt download for paid invoices
- Uses `trpc.payment.myPayments.query()`

**Payment page** (`apps/frontend/src/routes/app/payment/[id]/+page.svelte`):
- Displays payment details with company information
- Stripe Elements integration for secure checkout
- Bank details (IBAN, BIC) for reference
- Handles payment confirmation and redirect

### Backoffice Application Structure

**Dashboard** (`apps/backoffice/src/routes/admin/+page.svelte`):
- Statistics overview with charts
- Recent activity

**Clients page** (`apps/backoffice/src/routes/admin/clients/+page.svelte`):
- List all clients with search and pagination
- Create client modal (creates user + client profile simultaneously)
- Edit client information
- Delete client with confirmation
- Uses AutoTable for data display

**Payments page** (`apps/backoffice/src/routes/admin/payments/+page.svelte`):
- Statistics cards (total pending, total paid, counts)
- Payment creation form with client selection
- Filter by status and client
- Create payment (automatically sends email via SMTP)
- Cancel/expire payments
- Uses AutoTable for data display

**Settings page** (`apps/backoffice/src/routes/admin/settings/+page.svelte`):
- Company information form
- Contact details (email, phone)
- Bank details (bank name, IBAN, BIC)
- TVA rate configuration
- Logo upload with preview

**Users page** (`apps/backoffice/src/routes/admin/users/+page.svelte`):
- Uses AutoTable from `@repo/ui` for CRUD operations
- Integrated with `admin.users` tRPC router

**Statistics page** (`apps/backoffice/src/routes/admin/statistics/+page.svelte`):
- Payment analytics with charts
- Revenue tracking

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

## Common Issues & Troubleshooting

### "Buffer is not defined" in Browser

**Cause**: Node.js modules (like `pg` from Prisma) are being imported in browser code.

**Fix**: The `@repo/database` package uses conditional exports. Ensure:
1. Vite config includes `optimizeDeps.exclude: ['@repo/database', '@prisma/client', 'pg']`
2. Package.json has browser/default conditional exports
3. Browser stub at `packages/database/src/browser.ts` exists

### "Invalid credentials" after Login

**Cause**: Password hashing mismatch between user creation and authentication.

**Fix**: Always use `AuthManager.hashPassword()` when creating users:
```typescript
import { AuthManager } from '@repo/auth';
const auth = new AuthManager({ encryptionSecret: process.env.ENCRYPTION_SECRET });
const passwordHash = await auth.hashPassword(password);
```

Never use `bcrypt` directly as it's incompatible with the backend's `CryptoService`.

### Database Connection Errors

**Cause**: Incorrect `DATABASE_URL` or database doesn't exist.

**Fix**:
```bash
just init              # Creates database and pushes schema
# Or manually:
createdb charles
cd packages/database && DATABASE_URL="postgresql://fangafunk@localhost:5432/charles" bun run db:push
```

### Frontend Can't Connect to Backend

**Cause**: Backend not running or incorrect `VITE_API_URL`.

**Fix**:
1. Ensure backend is running: `just backend` or `cd apps/backend && bun run dev`
2. Check `VITE_API_URL` in `apps/frontend/.env` matches backend URL (default: `http://localhost:3001`)
3. Verify CORS settings in backend: `TRUSTED_ORIGINS` should include frontend URL

### Prisma Client Not Generated

**Cause**: Missing Prisma client generation step.

**Fix**:
```bash
just generate          # Generate Prisma client
# Or:
cd packages/database && bun run db:generate
```

### Type Errors in Frontend/Backoffice

**Cause**: Stale Prisma types or missing imports.

**Fix**:
```bash
just generate          # Regenerate Prisma client
just typecheck         # Check for remaining errors
```

## Known Issues & TODOs

See `TODO.md` and `SETUP.md` for planned features including:
- Document generation with Typst (currently placeholder)
- SMTP configuration for production (structure exists, needs real credentials)
- Stripe webhook testing (needs webhook secret configuration)
- Email verification and password reset
- OAuth (Google, GitHub)
- 2FA
- Redis caching
- Cron jobs
- Testing infrastructure
- Multi-tenant support
