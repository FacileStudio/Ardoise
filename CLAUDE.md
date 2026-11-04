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
- **UI**: `@facile/muse` (pinned by tag in `apps/web/package.json`); app-only components in `apps/web/src/lib/ui`
- **i18n**: Custom type-safe system (en/fr)
- **Deploy**: Docker Compose / Railway

## Key Commands

Use `mise run` (task runner, pins bun, node and Postgres) or `bun run`:

| Command | What it does |
|---|---|
| `mise run db:setup` | Full setup: install, start local Postgres, generate Prisma, push schema |
| `mise run dev` | Run backend + web in parallel |
| `mise run //apps/backend:dev` | Backend only (port 3001) |
| `mise run //apps/web:dev` | Web app only (port 3000) |
| `mise run //packages/database:generate` | Generate Prisma client |
| `mise run //packages/database:push` | Push Prisma schema to DB |
| `mise run db:studio` | Open Prisma Studio |
| `mise run typecheck` | Typecheck all workspaces |
| `mise run lint` | Lint all workspaces |
| `mise run format` | Prettier format |
| `mise run build` | Build all apps |

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
      /admin/     Admin routes (clients, payments, documents, spaces, settings)
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
  admin/          Admin engine for AutoTable/AutoForm
  typst/          Typst document and receipt rendering, string escaping
  nuage/          Optional contract archive client for Nuage
  plume/          Optional signature client and webhook helpers for Plume
  glouton/        Optional Glouton client sync: signed outbound events and helpers
  types/          Shared TypeScript types
  utils/          Shared utility functions
  logger/         Logging utilities
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

Each module lives in `packages/trpc/src/modules/[name]/` with `router.ts` and `service.ts`. Modules: auth, user, client, mission, payment, settings, document, media, admin, stripe, billing. Three procedure levels: `publicProcedure`, `protectedProcedure`, `adminProcedure`.

### Authentication

Custom JWT sessions via `AuthManager` from `@repo/auth`. Nobody signs in with a password: staff use Facile SSO (see OIDC) and clients use a magic link. There is no `auth.login`, no bootstrap admin, no users admin and no invitations. `User.password` is a legacy nullable column nothing reads.

### Client sign-in (magic link)

`@facile/magiclink` (git tag dependency in `packages/trpc`) plus `packages/trpc/src/modules/magic-link/`. `magicLink.request` always answers `{ ok: true }` and mails a link only to active, unblocked CLIENT users. The link opens `/login/verify?token=...`, whose button calls `magicLink.consume` (POST, one use, 15 minutes). Only the sha256 hash is stored in `MagicLink`. `consume` runs `loginBlockReason`, then `issueSession`. `client.create` with `createCredentials` mails a welcome link that skips the public rate limit. Limits: `MAGIC_LINK_TTL_MINUTES`, `MAGIC_LINK_MAX_PER_EMAIL_HOUR`, `MAGIC_LINK_MAX_PER_IP_HOUR`. `GET /auth/config` reports `client_magic_link`.

### Client portal and manual data

`/app` is the client dashboard, fed by `packages/trpc/src/modules/portal/` (`overview`, `documents`, `documentDownload`, `signLink`), all scoped to the caller's `Client` and space. Clients see only `devis`, `facture_prestation`, `appel_de_fonds`, `contrat_prestation`, `contrat_maintenance`, `back_contractuel` and `maintenance`. `portal.signLink` returns `Document.plumeClientSignUrl`, the client's own Plume `signing_url`; `plumeUrl` is Plume's owner page and a client cannot use it. Plume returns `signing_url` only on create and on `GET /api/documents/lookup?external_ref=`, so `getSigners` in `packages/plume` uses the lookup.

Documents made outside Ardoise come in through `document.import` (`source = imported`, `issuedAt` is the real date, the PDF is stored as-is). A paid imported invoice also creates a `MANUAL` `PAID` payment. `document.update`, `document.setSignature` and the manual payment procedures (`createManual`, `setStatus`, `delete`) let an admin fix anything by hand. Deletes of referenced records answer `PRECONDITION_FAILED` with the blocking counts.

### OIDC

Facile SSO (Registre) is the only staff login, in `apps/backend/src/oidc/` (see `docs/architecture.md`). Production refuses to boot without `OIDC_ISSUER`. Anyone who signs in is staff: `resolveUser` (`apps/backend/src/oidc/identity.ts`) finds them by `(issuer, sub)`, then by verified email, else creates them, and every sign-in sets `role = ADMIN` plus `firstName`, `lastName` (split from the `name` claim, since Registre sends no given/family names) and `ssoPictureUrl`. Ardoise keeps no separate admin list, and `user.updateProfile` refuses staff. `GET /auth/config` returns `oidc_enabled` and `client_magic_link`.

### Prisma

Multi-file schema in `packages/database/prisma/schema/`. Core models: User, Client, Mission, Payment, Document, Settings, Media. The `@repo/database` package has conditional exports (browser stub vs. real client) to prevent Node.js imports in the browser.

### Payments flow

Admin creates a mission for a client and lists its prestations (the billable lines). The quote and the invoice are generated from them on request: a new quote after each change of the lines, then, once the quote is accepted, a full invoice or a deposit and a balance (`mission.generateQuote`, `acceptQuote`, `generateInvoice`). The payment of an invoice comes from `mission.createPayment`, and a payment can also be created on its own.

Flow of a payment: admin creates payment -> backend sends email to client -> client clicks payment link -> Stripe checkout -> webhook updates status to PAID -> receipt available.

### Storage

Pre-signed URL flow: client requests URL via tRPC -> server generates it -> client uploads directly to S3 -> client confirms via tRPC.

## Environment Variables

Schemas defined in `packages/env/src/index.ts`. Each app validates on startup via `check-env`.

Backend requires: `DATABASE_URL`, `ENCRYPTION_SECRET`, `OIDC_ISSUER`/`OIDC_CLIENT_ID`/`OIDC_CLIENT_SECRET` (production), `BACKEND_URL`, `FRONTEND_URL`. Stripe/SMTP/company settings are configured in the admin UI, not env vars.

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

- `@facile/muse/styles` resets Tailwind's palette: use `fc-*` tokens (`text-fc-danger`, `bg-fc-success/10`), never `red-500` style classes. `app.css` aliases `bg-primary`, `text-muted-foreground` and friends onto `fc-*`
- `@facile/muse` needs `@source` in `app.css` and `optimizeDeps.exclude` in `vite.config.ts`, or its utilities silently never generate
- Prisma client must be generated before build/dev/typecheck (Turbo handles this, but manual runs need `mise run //packages/database:generate` first)
- Browser imports of `@repo/database` get a null stub for `prisma` -- add `@repo/database`, `@prisma/client`, `pg` to Vite `optimizeDeps.exclude`
- `BACKEND_URL` is passed as `VITE_API_URL` at Docker build time to the web app
- CORS origins are derived from `FRONTEND_URL` env var
- Local staff sign-in needs a reachable Registre: set the `OIDC_*` variables

## Nuage, Plume and Glouton links

All optional and all-or-nothing (`NUAGE_*`, `PLUME_*`, `GLOUTON_*`, see `docs/configuration.md`).

- Creating a `contrat_prestation`, `contrat_maintenance` or `back_contractuel` uploads the stored PDF to Nuage, fire and forget, with `linked_to` `ardoise:contract:<id>`.
- `document.sendForSignature({ id })` sends the stored PDF to Plume with the mission's client and the provider as signers, `external_ref` `ardoise:contract:<id>`, and sets `signatureStatus` to `sent`. `document.signatureEnabled` tells the UI whether Plume is configured.
- `POST /webhooks/plume` verifies `x-plume-signature-256` and moves the document to `signed` or `declined`, and stamps `nuageArchivedAt` on `document.archived`. Replays change nothing.
- Glouton: client and mission events go to Glouton after the response (`packages/trpc/src/modules/webhook/glouton.ts`); Glouton writes come in on `/api/integrations/glouton/clients` (`apps/backend/src/handlers/glouton.ts`), last write wins on `updatedAt`, and are never sent back to Glouton.

## Suite billing (forfait)

`packages/trpc/src/modules/billing/` makes Ardoise the suite's billing backoffice. Billing customers are Registre spaces (`SpaceSubscription`), not Ardoise `Client` rows. Schema in `prisma/schema/billing.prisma`.

- `resolve.ts` is the one pure resolution: override > owner comp > subscription plan version (past_due keeps it 7 days) > feature default; a person gets the most generous value across the spaces they own. Never recompute it elsewhere.
- Staff gate: every `billing.*` procedure uses `billingStaffProcedure` (`staff.ts`), which re-reads the user and requires a verified, active ADMIN listed in `BILLING_STAFF_EMAILS`. Every SSO sign-in is ADMIN, so never gate billing on the role alone. `/admin/offres/+layout.server.ts` checks `billing.access` server side.
- Published plan versions are immutable; `publish` (`stripe-sync.ts`) creates Stripe prices with lookup keys `plan_<key>_<interval>`. Comps use the latest version of the plan, even a draft.
- `/billing/*` (`apps/backend/src/handlers/billing.ts`) is server-to-server for Registre: Bearer `BILLING_API_TOKEN` only, never an Ardoise session. Checkout prices come only from a published lookup key.
- `/webhook` sends events whose subscription metadata has `registre_space_id` to `webhook.ts` (dedupe in `BillingEvent`, customer cross-check); everything else stays on `paymentService.handleWebhook`.
- `push.ts` PUTs every space and person entitlement to Registre (`DirectoryClient.putEntitlements`, OIDC client Basic auth) when anything changes and every 10 minutes; `apps/backend/src/billing.ts` starts it. Seed: `mise run billing:seed` or `BILLING_SEED_ON_BOOT=true`.

## Releasing

Versions follow SemVer, with the root `package.json` `version` as the source of truth. While on `0.x`, a breaking change bumps the minor.

1. Move the `## [Unreleased]` entries of `CHANGELOG.md` under a new `## [X.Y.Z] - YYYY-MM-DD` heading.
2. Set the same version in the root `package.json`.
3. Commit, merge to `main`, then tag `vX.Y.Z` and push the tag.

Workflows in `.github/workflows/`:

- `filet.yml`: runs the filet code-quality check on pushes to `main` and on pull requests.
- `ci.yml`: install, Prisma generate, typecheck and lint on pushes to `main` and on pull requests.
- `release.yml`: on a `v*` tag, checks that the tag equals the `package.json` version and that `CHANGELOG.md` has a matching section, runs the same typecheck and lint, pushes `ghcr.io/facilestudio/ardoise` (backend image, `VERSION` build arg set to the tag) and creates the GitHub release from the changelog section.

A tag does not deploy: Dokploy auto-deploys the Compose stack on every push to `main`, and `apps/*/railway.toml` only describe Railway builds. `GET /version` returns the `VERSION` build arg, else `RAILWAY_GIT_COMMIT_SHA`, else `dev`.
