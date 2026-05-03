# Charles - Payment & Invoicing Platform

Charles is an internal payment and invoicing platform for Facile Studio, built with modern web technologies and full-stack type safety.

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
│   ├── frontend/         # SvelteKit client portal (port 3000)
│   └── backoffice/       # SvelteKit admin panel (port 3002)
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
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `apps/backend/.env` with your credentials:

```env
DATABASE_URL=postgresql://fangafunk@localhost:5432/charles
ENCRYPTION_SECRET=your-secret-key-min-32-chars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadminpassword
MINIO_BUCKET_NAME=charles-uploads
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
COMPANY_NAME=Facile Studio
COMPANY_ADDRESS=123 Example Street
COMPANY_CITY=75001 Paris, France
COMPANY_SIRET=123 456 789 00010
COMPANY_EMAIL=contact@facile.studio
COMPANY_PHONE=+33 1 23 45 67 89
```

Edit `apps/frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/trpc
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Database Setup

Using Just (recommended):

```bash
just init              # Complete setup: install, generate, createdb, push schema
just create-admin      # Create admin account (yann@facile.studio / testcaca123)
```

Or manually:

```bash
createdb charles
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
just frontend         # Frontend only (port 3000)
just backoffice       # Backoffice only (port 3002)
```

Access the applications:
- Frontend (client portal): http://localhost:3000
- Backend (API): http://localhost:3001
- Backoffice (admin): http://localhost:3002

## Available Commands

### Just Commands

```bash
just init              # Complete setup: install, generate, createdb, push schema
just create-admin      # Create admin account
just dev               # Run all apps
just backend           # Run backend only
just frontend          # Run frontend only
just backoffice        # Run backoffice only
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
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Backoffice: http://localhost:3002
- MinIO Console: http://localhost:9001

The base `docker-compose.yml` exposes app ports only inside Docker so Dokploy can
route them without binding host ports. `docker-compose.override.yml` publishes
`3000`, `3001`, and `3002` for local runs.

4. View logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f backoffice
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
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `MINIO_*` variables
- `SMTP_*` variables
- `COMPANY_*` variables
- `FRONTEND_URL`
- `TRUSTED_ORIGINS`

#### Frontend & Backoffice

```bash
cd apps/frontend  # or apps/backoffice
bun run build
node build
```

Build-time environment variables:
- `VITE_API_URL`
- `PUBLIC_STRIPE_PUBLISHABLE_KEY`

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
- Email: `yann@facile.studio`
- Password: `testcaca123`

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

1. Admin creates payment in backoffice
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
createdb charles
cd packages/database
DATABASE_URL="postgresql://fangafunk@localhost:5432/charles" bun run db:push
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
