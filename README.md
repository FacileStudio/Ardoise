# Ardoise

Self-hosted invoicing and payment platform for a small studio: admins raise payment requests,
clients pay them through Stripe, and invoices, quotes and contracts are rendered to PDF with
Typst.

One SvelteKit app serves both sides — a client portal under `/app` and an admin panel under
`/admin` — against a Hono + tRPC backend. `ardoise-cli` is a **different, unrelated project**
(a standalone Typst PDF generator); the two share a name and nothing else.

## What it does

- Payment requests with Stripe Payment Intents, subscriptions, and manual bank-transfer collection
- Client records with company, SIRET and intra-community VAT details, optional portal credentials
- Typst-rendered documents: invoices, maintenance quotes, service and maintenance contracts,
  co-contracting back-to-back agreements, capital calls
- Per-provider issuer identity so documents can be billed under different legal entities
- Spaces: shared workspaces that scope clients, documents, payments and providers
- Automatic payment emails, reminders, and receipt PDFs over configurable SMTP
- Generic admin CRUD engine with per-entity permissions and an audit trail
- Email/password auth plus optional OIDC SSO (Registre), invite-only: SSO signs in existing users and never creates one

## Stack

| Layer | Tech |
|---|---|
| API | Bun, Hono 4, tRPC 11, Prisma, PostgreSQL 16, Typst 0.13 |
| Client | SvelteKit 2.50 (Svelte 5 runes), Tailwind CSS 4, Stripe.js |
| Deploy | Docker Compose, two containers behind Traefik |

Zod is pinned at `^3.24.1` across every workspace package — Ardoise is on the **zod 3** side of
the suite split.

## Quick start

```sh
cp .env.production.example .env
docker compose up -d
```

Then open <http://localhost:3000>. The API answers on <http://localhost:3001>.

### Local development

```sh
mise run db:setup
mise run dev
```

`mise run db:setup` installs dependencies, starts a repo-local Postgres on port 5433, creates the
`ardoise` database, generates the Prisma client and pushes the schema. The backend bootstraps an admin account from `ADMIN_EMAIL` and
`ADMIN_PASSWORD` on every startup.

## Configuration

| Variable | What it does |
|---|---|
| `NODE_ENV` | `development`, `production` or `test`; required, no default |
| `DATABASE_URL` | Postgres connection string |
| `ENCRYPTION_SECRET` | JWT signing key and storage-ticket secret, minimum 32 characters |
| `ADMIN_EMAIL` | Bootstrap admin account, created on startup |
| `ADMIN_PASSWORD` | Bootstrap admin password, minimum 8 characters |
| `BACKEND_URL` | Public API origin, also the base for storage URLs |
| `FRONTEND_URL` | Public web origin, drives the CORS allow-list |

Stripe keys, SMTP credentials, DocuSeal and company details are **not** environment variables —
they live in the `Settings` table and are edited in the admin UI.

Full reference: [docs/configuration.md](docs/configuration.md).

## Structure

```
apps/
  backend/   Hono server — handlers/ (trpc, oidc, storage, stripe, health), lib/ (env, bootstrap)
  web/       SvelteKit app — routes/app (client portal), routes/admin (admin panel)
packages/
  trpc/      tRPC router, one directory per module under src/modules/
  database/  Prisma multi-file schema in prisma/schema/, generated zod types
  auth/      AuthManager — HS256 JWT via jose, argon2 hashing via @repo/crypto
  typst/     Typst template rendering for invoices, quotes and contracts
  stripe/    Stripe SDK wrapper           smtp/  Nodemailer transport
  storage/   Local filesystem object store, ticket-signed uploads
  admin/     Entity registry powering the generic admin CRUD screens
  i18n/      Type-safe en/fr strings
docs/        Architecture, configuration, development, deployment, API
```

## Documentation

| Doc | What's in it |
|---|---|
| [Architecture](docs/architecture.md) | Runtime topology, request flow, data model, auth |
| [Configuration](docs/configuration.md) | Every environment variable and default |
| [Development](docs/development.md) | Local setup, `just` recipes, typecheck and lint |
| [Deployment](docs/deployment.md) | Docker Compose, Dokploy, Traefik, migrations |
| [API](docs/api.md) | The tRPC router tree and the plain HTTP routes |

---

Part of the [Facile Suite](https://facile.studio) — self-hosted tools for creative studios
and freelancers. One login, zero cloud dependency.
