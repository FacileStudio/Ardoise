# tRPC Monorepo Template

Clean, minimal tRPC-based monorepo with Hono backend, SvelteKit frontends, and Expo mobile app.

## Architecture Overview

This project is structured as a monorepo, leveraging Turborepo for efficient development and build processes. It features an end-to-end type-safe architecture, with tRPC connecting various applications through a unified API layer.

### Monorepo Structure

-   **`apps/`**: Contains all independent applications within the monorepo (e.g., `frontend`, `backend`, `backoffice`, `mobile`). Each app is a distinct deployable unit.
-   **`packages/`**: Houses shared libraries, utilities, configurations, and core functionalities (`database`, `trpc`, `validators`, `types`, `tsconfig`) that are consumed by the applications. This promotes code reuse and consistency across the monorepo.

### Apps

- `frontend`: SvelteKit landing page with contact form (port 5173)
- `backend`: Hono + tRPC server with JWT auth (port 3001)
- `backoffice`: SvelteKit admin panel to view submissions (port 3002)
- `mobile`: Expo app with contact form

### Packages

- `@repo/database`: Prisma schema + client (SQLite)
- `@repo/trpc`: tRPC router, procedures, and context
- `@repo/validators`: Shared Zod validation schemas
- `@repo/types`: Shared TypeScript type definitions
- `@repo/tsconfig`: Shared TypeScript configurations

## Tech Stack

- **Monorepo**: Turborepo 2.7.5
- **API Layer**: tRPC 11.0 + @hono/trpc-server
- **Backend**: Hono 4.11.4 on Bun
- **Database**: Prisma + SQLite
- **Frontend**: SvelteKit 2.50.0 + Tailwind CSS
- **Mobile**: Expo SDK 54.0.31 with React Native 0.79.3
- **Validation**: Zod 4.3.5 (shared)
- **Styling**: Tailwind CSS + Poppins (titles) + Satoshi (body)
- **Package Manager**: Bun

## Quick Start

```bash
bun install
cd packages/database && bun run db:push
bun run dev
```

### Environment Setup

Create `.env` in root:
```bash
ADMIN_PASSWORD=admin-super-secret-password-12345
PORT=3001
```

### Development

Run all apps:
```bash
bun run dev
```

Run individual apps:
```bash
cd apps/backend && bun run dev      # tRPC server
cd apps/frontend && bun run dev     # Landing page
cd apps/backoffice && bun run dev   # Admin panel
cd apps/mobile && bun run dev       # Expo app
```

### Ports

- Frontend: http://localhost:5173
- Backend (tRPC): http://localhost:3001/trpc
- Backoffice: http://localhost:3002
- Mobile: Expo Go app or simulator

## Project Structure

```
.
├── apps
│   ├── frontend      # SvelteKit landing page with contact form
│   ├── backend       # Hono + tRPC server
│   ├── backoffice    # SvelteKit admin panel (JWT auth)
│   └── mobile        # Expo app with contact form
├── packages
│   ├── database      # Prisma schema + client (SQLite)
│   ├── trpc          # tRPC router, procedures, context
│   ├── validators    # Zod schemas (shared validation)
│   ├── types         # Shared TypeScript types
│   └── tsconfig      # TS configs
```

## Features

### End-to-End Flow

1. **Landing Page (Frontend)**: User submits email, firstName, lastName
2. **tRPC Backend**: Validates with Zod, stores in Prisma (SQLite)
3. **Admin Login (Backoffice)**: Admin logs in with password
4. **View Submissions**: Admin sees all contact submissions
5. **Mobile App**: Same form available in Expo app

### Technical Features

- Full end-to-end type safety (tRPC)
- Shared validation logic (Zod)
- JWT-based admin authentication
- Prisma ORM with SQLite
- Tailwind CSS with custom fonts
- Clean, minimal, compact code
- Turborepo for fast builds

## tRPC API Endpoints

- `contact.create` - Submit contact info (public)
- `contact.list` - List all contacts (protected, requires JWT)
- `auth.login` - Admin login with password

## Admin Credentials

**Default Password**: `admin-super-secret-password-12345`

Change in `.env`:
```bash
ADMIN_PASSWORD=your-secure-password
```

## Database

Using Prisma with SQLite for simplicity. Located at `packages/database/prisma/dev.db`.

Reset database:
```bash
cd packages/database
rm prisma/dev.db
bun run db:push
```

## Styling

- Tailwind CSS in frontend and backoffice
- Poppins font for titles
- Satoshi font for body text
- Minimal, functional design

## License

MIT
