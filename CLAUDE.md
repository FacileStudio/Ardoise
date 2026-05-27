# Ardoise

Internal payment and invoicing platform for Facile Studio. Clients receive payment requests via email, pay through Stripe, and admins manage everything from the admin panel.

## Tech Stack

- **Runtime/PM**: Bun 1.2+
- **Monorepo**: Turborepo with `apps/*` and `packages/*` workspaces
- **Backend**: Hono + tRPC 11 (port 3001)
- **Web**: SvelteKit 2.50+ / Svelte 5 runes (unified client + admin, port 3000)
- **Database**: PostgreSQL 16 + Prisma (multi-file schema)
- **Payments**: Stripe (Elements + webhooks)
- **Storage**: S3-compatible (MinIO in dev, configurable)
- **Email**: Nodemailer over SMTP
- **Styling**: Tailwind CSS 4
- **i18n**: Custom type-safe system (en/fr)
- **Deploy**: Docker Compose / Railway

## Key Commands

Use `just` (recommended) or `bun run`:

| Command | What it does |
|---|---|
| `just init` | Full setup: install, generate Prisma, create DB, push schema |
| `just dev` | Run backend + web in parallel |
| `just backend` | Backend only (port 3001) |
| `just web` | Web app only (port 3000) |
| `just generate` | Generate Prisma client |
| `just push` | Push Prisma schema to DB |
| `just studio` | Open Prisma Studio |
| `just typecheck` | Typecheck all workspaces |
| `just lint` | Lint all workspaces |
| `just format` | Prettier format |
| `just build` | Build all apps |
| `just create-admin` | Create admin user for local dev |

Database scripts (from `packages/database`):

```
bun run db:generate        # Generate Prisma client
bun run db:push            # Push schema (dev)
bun run db:migrate:dev     # Create migration
bun run db:migrate:deploy  # Apply migrations (prod)
bun run db:studio          # Prisma Studio
```

## Project Structure

```
apps/
  backend/        Hono + tRPC API server
  web/            SvelteKit unified app (client portal + admin panel)
    src/routes/
      /           Landing page
      /login      Unified login (redirects by role)
      /app/       Client routes (payments, profile, settings)
      /admin/     Admin routes (clients, payments, documents, users, settings)
      /legal/     Legal pages (privacy, terms, cookies)

packages/
  database/       Prisma schema (multi-file in prisma/schema/) + client
  trpc/           tRPC router + procedures (modules in src/modules/)
  trpc-client/    Universal tRPC client factory (browser/Node)
  auth/           JWT auth with AuthManager (server-only)
  auth-shared/    Shared auth utilities (hasAccess, roles)
  env/            Zod environment validation schemas
  stripe/         Stripe SDK wrapper
  smtp/           Nodemailer email service (server-only)
  storage/        S3/MinIO service (server-only)
  storage-client/ Browser-side upload utilities
  crypto/         Encryption utilities
  i18n/           Type-safe i18n (en/fr)
  ui/             Shared Svelte components (AutoForm, AutoTable)
  admin/          Admin engine for AutoTable/AutoForm
  typst/          Document generation (placeholder)
  types/          Shared TypeScript types
  utils/          Shared utility functions
  logger/         Logging utilities
  docuseal/       DocuSeal integration
  eslint-config/  Shared ESLint config
  tsconfig/       Shared TypeScript configs
```

## Architecture Notes

### Unified Web App

The web app (`apps/web`) serves both client and admin interfaces from a single SvelteKit app. Route-based separation:
- `/app/*` routes require authentication (any role)
- `/admin/*` routes require ADMIN role (enforced in root layout + tRPC `adminProcedure`)
- Login page redirects users to `/app` or `/admin/clients` based on their role

### tRPC modules

Each module lives in `packages/trpc/src/modules/[name]/` with `router.ts` and `service.ts`. Modules: auth, user, client, payment, settings, document, media, admin, stripe. Three procedure levels: `publicProcedure`, `protectedProcedure`, `adminProcedure`.

### Authentication

Custom JWT auth via `AuthManager` from `@repo/auth`. Password hashing uses Argon2/scrypt through `CryptoService`. Always use `AuthManager.hashPassword()` when creating users -- never bcrypt directly. The backend auto-creates an admin user on first startup from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars.

### Prisma

Multi-file schema in `packages/database/prisma/schema/`. Core models: User, Client, Payment, Settings, Media. The `@repo/database` package has conditional exports (browser stub vs. real client) to prevent Node.js imports in the browser.

### Payments flow

Admin creates payment -> backend sends email to client -> client clicks payment link -> Stripe checkout -> webhook updates status to PAID -> receipt available.

### Storage

Pre-signed URL flow: client requests URL via tRPC -> server generates it -> client uploads directly to S3 -> client confirms via tRPC.

## Environment Variables

Schemas defined in `packages/env/src/index.ts`. Each app validates on startup via `check-env`.

Backend requires: `DATABASE_URL`, `ENCRYPTION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BACKEND_URL`, `FRONTEND_URL`. Stripe/SMTP/company settings are configured in the admin UI, not env vars.

Web app: `PORT`, `VITE_API_URL` (set from `BACKEND_URL` by Docker Compose).

See `apps/backend/.env.example` for reference.

## Conventions

- Bun for everything (no npm/yarn/pnpm)
- Svelte 5 runes API (`$state`, `$props`, `$derived`, `$effect`)
- Tailwind CSS 4 for styling
- Prettier config: single quotes, no tabs, trailing commas (es5), 100 print width
- Turbo tasks: `build` and `dev` depend on `db:generate` + `check-env`; `typecheck` depends on `db:generate`
- No test infrastructure yet
- Docker Compose base file exposes ports only inside Docker; `docker-compose.override.yml` publishes them for local runs

## Gotchas

- Prisma client must be generated before build/dev/typecheck (Turbo handles this, but manual runs need `just generate` first)
- Browser imports of `@repo/database` get a null stub for `prisma` -- add `@repo/database`, `@prisma/client`, `pg` to Vite `optimizeDeps.exclude`
- `BACKEND_URL` is passed as `VITE_API_URL` at Docker build time to the web app
- CORS origins are derived from `FRONTEND_URL` env var
- Default dev admin: `admin@example.com` / `admin123456789`
