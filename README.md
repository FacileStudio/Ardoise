# Ardoise - Payment & Invoicing Platform

Ardoise is an internal payment and invoicing platform for Facile Studio, built with modern web technologies and full-stack type safety.

## Features

- Payment request creation and management
- Stripe integration for secure payments
- Automated email notifications via SMTP
- Client management system
- Invoice generation and receipt downloads
- Admin dashboard with statistics and analytics
- Settings management (company info, bank details, TVA)
- File uploads with S3-compatible storage (MinIO)
- Full end-to-end type safety with tRPC
- Multi-language support (English/French)

## Tech Stack

**Core**
- Bun (runtime & package manager)
- TypeScript (strict mode)
- Turborepo (monorepo orchestration)

**Backend**
- Hono (web framework)
- tRPC 11 (type-safe API)
- Prisma (ORM)
- PostgreSQL (database)
- Stripe (payments)
- Nodemailer (SMTP emails)
- MinIO (S3-compatible storage)

**Frontend**
- SvelteKit 2.50+ (SSR framework)
- Svelte 5+ with runes
- Tailwind CSS 4+
- Stripe Elements

**Deployment**
- Docker & Docker Compose
- Railway ready

## Project Structure

```
.
├── apps/
│   ├── backend/          # Hono + tRPC API server (port 3001)
│   └── web/              # SvelteKit unified app — client portal + admin panel (port 3000)
│
└── packages/
    ├── admin/            # Admin engine for AutoTable/AutoForm
    ├── auth/             # JWT authentication (server-only)
    ├── auth-shared/      # Shared auth utilities
    ├── crypto/           # Encryption utilities
    ├── database/         # Prisma schema + client
    ├── env/              # Zod environment validation
    ├── i18n/             # Internationalization
    ├── logger/           # Logging utilities
    ├── smtp/             # Email service (server-only)
    ├── storage/          # MinIO S3 service (server-only)
    ├── storage-client/   # File upload utilities (client)
    ├── stripe/           # Stripe integration
    ├── trpc/             # tRPC router + procedures (server)
    ├── trpc-client/      # Universal tRPC client (client)
    ├── types/            # Shared TypeScript types
    ├── typst/            # Document generation (placeholder)
    ├── ui/               # Shared Svelte components
    ├── utils/            # Shared utilities
    └── tsconfig/         # Shared TypeScript configs
```

## Quick Start

### Prerequisites

- Bun 1.2.0 or higher
- PostgreSQL 16
- MinIO or S3-compatible storage
- Stripe account
- SMTP server access

### Installation

```bash
bun install
```

### Environment Setup

Copy environment examples and configure:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/backend/.env` with your credentials:

```env
DATABASE_URL=postgresql://user@localhost:5432/ardoise
ENCRYPTION_SECRET=your-secret-key-min-32-chars
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadminpassword
MINIO_BUCKET_NAME=ardoise-uploads
```

Configure Stripe, SMTP, and company details in the admin settings screen.
`BACKEND_URL` is passed to the web app as `VITE_API_URL` during Docker builds so browser API calls target the backend domain.

### Database Setup

Using Just (recommended):

```bash
just init              # Complete setup: install, generate, createdb, push schema
just create-admin      # Create admin account (admin@example.com / admin123456789)
```

Or manually:

```bash
createdb ardoise
cd packages/database && bun run db:push
bun run scripts/create-admin.ts
```

### Development

Start all services:

```bash
just dev              # Recommended: runs all apps in parallel
# OR
bun run dev           # Alternative: Turborepo dev command
```

Start individual services:

```bash
just backend          # Backend only (port 3001)
just web              # Web app only (port 3000)
```

Access the applications:
- Web app: http://localhost:3000 (client portal at `/app`, admin panel at `/admin`)
- Backend (API): http://localhost:3001

## Available Commands

### Just Commands

```bash
just init              # Complete setup: install, generate, createdb, push schema
just create-admin      # Create admin account
just dev               # Run all apps
just backend           # Run backend only
just web               # Run web app only
just generate          # Generate Prisma client
just push              # Push schema to database (dev)
just studio            # Open Prisma Studio
just typecheck         # Type check all apps
just lint              # Lint all apps
just format            # Format with Prettier
just build             # Build all apps
```

### Bun/NPM Scripts

```bash
bun run dev                        # Run all apps (Turborepo)
bun run build                      # Build all apps
bun run typecheck                  # Type check all apps
bun run lint                       # Lint all apps
bun run format                     # Format with Prettier

cd packages/database
bun run db:generate                # Generate Prisma client
bun run db:push                    # Push schema (development)
bun run db:migrate:dev             # Create migration (development)
bun run db:migrate:deploy          # Apply migrations (production)
bun run db:studio                  # Open Prisma Studio
```

## Production Deployment

### Docker Compose (Local Production Test)

1. Create `.env` file in project root with production variables (see `.env.production.example`)

2. Start all services:

```bash
docker-compose up -d
```

3. Access services:
- Web app: http://localhost:3000
- Backend: http://localhost:3001

The base `docker-compose.yml` exposes app ports only inside Docker so Dokploy can
route them without binding host ports. `docker-compose.override.yml` publishes
`3000` and `3001` for local runs.

4. View logs:

```bash
docker-compose logs -f backend
docker-compose logs -f web
```

5. Stop services:

```bash
docker-compose down
```

### Railway Deployment

See [RAILWAY.md](./RAILWAY.md) for detailed Railway deployment instructions.

### Manual Production Deployment

#### Backend

```bash
cd apps/backend
bun run build
bun run start
```

Required environment variables:
- `DATABASE_URL`
- `ENCRYPTION_SECRET`
- `MINIO_*` variables
- `BACKEND_URL`
- `FRONTEND_URL`

#### Web App

```bash
cd apps/web
bun run build
node build
```

Optional build-time environment variables:
- `VITE_API_URL`, set from `BACKEND_URL` by Docker Compose

## Architecture

### Authentication

Custom JWT-based authentication system:
1. User logs in via `auth.login` tRPC mutation
2. Backend generates JWT token with `AuthManager`
3. Client stores token in localStorage
4. Token sent in `Authorization: Bearer <token>` header
5. Backend verifies token in tRPC context
6. Protected procedures check `ctx.user`

Default admin account (development):
- Email: `admin@example.com`
- Password: `admin123456789`

### Database

Multi-schema Prisma setup with PostgreSQL:

**Core models:**
- `User` - User accounts with roles
- `Client` - Client information (company, SIRET, address)
- `Payment` - Payment requests with Stripe integration
- `Settings` - Company configuration (singleton)
- `Media` - File uploads

**Database operations:**
```bash
cd packages/database

bun run db:generate          # Generate Prisma client
bun run db:push              # Push schema (dev)
bun run db:migrate:dev       # Create migration
bun run db:migrate:deploy    # Apply migrations (production)
bun run db:studio            # Browse data with Prisma Studio
```

### Payments Flow

1. Admin creates payment in admin panel
2. Backend automatically sends payment email to client
3. Client receives email with payment link
4. Client enters payment page and clicks "Payer maintenant"
5. Frontend creates Stripe checkout session
6. Client completes payment via Stripe
7. Stripe webhook updates payment status to PAID
8. Receipt becomes available for download

### Email Notifications

Automated payment emails sent via SMTP when:
- New payment request is created
- Payment reminder is triggered (future feature)

Email includes:
- Company logo and branding
- Payment details (amount, due date, description)
- Secure payment link
- Bank transfer details (IBAN, BIC)

### File Storage

S3-compatible storage with MinIO:
1. Client requests pre-signed URL via tRPC
2. Server generates URL (valid 15 minutes)
3. Client uploads directly to S3
4. Client confirms upload via tRPC
5. Server stores metadata in database

## Troubleshooting

### Database Connection Issues

```bash
createdb ardoise
cd packages/database
DATABASE_URL="postgresql://user@localhost:5432/ardoise" bun run db:push
```

### Prisma Client Not Found

```bash
cd packages/database
bun run db:generate
```

### Type Errors

```bash
cd packages/database
bun run db:generate
bun run typecheck
```

### Invalid Credentials After Login

Always use `AuthManager.hashPassword()` when creating users:

```typescript
import { AuthManager } from '@repo/auth';
const auth = new AuthManager({ encryptionSecret: process.env.ENCRYPTION_SECRET });
const passwordHash = await auth.hashPassword(password);
```

### Port Already in Use

```bash
lsof -ti:3001 | xargs kill -9
```

### Docker Build Issues

```bash
docker system prune -a
docker-compose build --no-cache
```

## Development Patterns

### Adding a tRPC Module

1. Create module directory: `packages/trpc/src/modules/[name]/`
2. Create `service.ts` with business logic
3. Create `router.ts` with tRPC procedures
4. Import and add to `appRouter` in `packages/trpc/src/index.ts`

Example:

```typescript
import { router, protectedProcedure } from '../../trpc';
import { z } from 'zod';

export const todoRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.todo.findMany({ where: { userId: ctx.user.id } });
  }),
  create: protectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.todo.create({
        data: { ...input, userId: ctx.user.id }
      });
    }),
});
```

### Adding a Prisma Model

1. Create schema file: `packages/database/prisma/schema/[model].prisma`
2. Define model with relations
3. Run `bun run db:push` or `bun run db:migrate:dev`
4. Prisma client auto-regenerates

### Adding Environment Variables

1. Add to schema in `packages/env/src/index.ts`
2. Update `.env.example` files
3. Environment validation runs on startup

## Security

- JWT tokens with secure encryption
- Role-based access control (RBAC)
- Stripe webhook signature verification
- SQL injection prevention via Prisma
- XSS protection via SvelteKit
- CORS configuration for trusted origins
- Non-root Docker users
- Environment variable validation

## Contributing

This is an internal Facile Studio project. For detailed development information, see [CLAUDE.md](./CLAUDE.md).

## License

Proprietary - Facile Studio Internal Use Only

## Support

For issues or questions, contact the development team at Facile Studio.
