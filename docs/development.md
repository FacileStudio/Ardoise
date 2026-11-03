# Ardoise — Development

Getting a working local Ardoise, the database workflow, and the checks to run before you push.

## Prerequisites

- **`mise`**, the task runner for this repo. `mise.toml` pins bun 1.2.0, node 22 and Postgres 16
  and defines every task. The Docker images build on `oven/bun:1.3.7`. No npm, yarn or pnpm — the
  lockfile is `bun.lock`
- **PostgreSQL**, repo-local through `mise run db:up`, or your own server, or
  `docker compose up -d ardoise-postgres`
- **`typst` 0.13** on `PATH` if you want document generation to work outside Docker. The
  container copies the binary from `ghcr.io/typst/typst:v0.13.1`

## Setup

```sh
mise trust . && mise install
mise run db:setup
```

That runs `bun install`, starts a Postgres under `.local/postgres` on `127.0.0.1:5433`, creates
the `ardoise` database, copies `.env.example` to `.env` in `apps/backend` and `packages/database`
when missing, points their `DATABASE_URL` at it, generates the Prisma client and pushes the
schema. `mise run db:down` stops it. To use another Postgres, skip `db:up` and set `DATABASE_URL`
in both `.env` files.

You still need a backend environment. The required variables are `NODE_ENV`, `DATABASE_URL`,
`ENCRYPTION_SECRET` (32+ characters), plus the `OIDC_*` variables to sign in as staff — see
[configuration.md](configuration.md). The backend refuses to start without them.

## Running

```sh
mise run dev                  # backend and web together, through Turborepo
mise run //apps/backend:dev   # backend only, port 3001
mise run //apps/web:dev       # web only, port 3000
```

`mise run dev` is `bun run dev`, which is `turbo run dev`. The `dev` task depends on `db:generate`
and `check-env`, so Turbo regenerates the Prisma client and validates the environment before
either app comes up.

Staff sign in with Facile SSO only. Point `OIDC_ISSUER` at a Registre (local or
`https://sso.facile.studio`) with an Ardoise client; the first sign-in creates the staff account.

Once running: the web app is at <http://localhost:3000> (client portal `/app`, admin panel
`/admin`), the API at <http://localhost:3001>, and interactive API reference at
<http://localhost:3001/docs>.

## Database workflow

The schema is split across `packages/database/prisma/schema/*.prisma`; `prisma.config.ts` points
Prisma at the directory rather than a single file.

```sh
mise run //packages/database:generate  # prisma generate + zod-prisma-types
mise run //packages/database:push      # prisma db push, development only
mise run db:studio                     # Prisma Studio

cd packages/database
bun run db:migrate:dev                 # create a migration
bun run db:migrate:deploy              # apply migrations, what production runs
mise run db:seed                       # demo dataset, see below
```

### Demo data

`mise run db:seed` fills a development database with a dataset to click through. It **deletes the
clients, providers, missions, documents, payments and spaces** already there, so use it on a
development database only. It refuses to run with `NODE_ENV=production`.

The seed goes through the real tRPC routers, so the quotes and invoices carry real numbers, real
PDFs (stored under the backend `STORAGE_PATH`) and real totals. Each of the eight missions stops at
a different point of the flow:

| Mission | State |
|---|---|
| Refonte du site vitrine | `DRAFT`, four prestations, 30 % deposit, no quote yet |
| Identité visuelle | `QUOTED`, quote v1 waiting for acceptance |
| Application de réservation | `ACCEPTED`, ready to invoice |
| Shooting catalogue | `INVOICED`, deposit paid, balance invoice with a pending payment |
| Maintenance annuelle 2026 | `PAID`, one full invoice paid |
| Landing page promotion | `INVOICED`, deposit paid, a prestation added since, so the quote is outdated |
| Site événementiel | `CANCELLED` |
| Refonte intranet | `ACCEPTED`, in the "Atelier Nord" space |

Everything but the last mission is in the "Studio" space. Providers are shared by both spaces.
Log in with `admin@seed.test` / `seed-password-1`. The portal client `client@seed.test` has no
password: request a link on `/login` and read it from your SMTP catcher. Every administrator already in the database is also added to both spaces.
Counters restart at 1, and running the seed twice gives the same result.

`db:generate` deletes `packages/database/src/zod` and regenerates it, then runs
`scripts/patch-zod-types.ts`. Two generators run: `prisma-client-js` and `zod-prisma-types`.

## Quality gate

There is no `scripts/check.sh`, no `.githooks/`, and no CI. GitHub Actions was removed
suite-wide. Run the checks yourself:

```sh
mise run typecheck  # turbo run typecheck — tsc for the backend, svelte-check for the web app
mise run lint       # turbo run lint — eslint with --max-warnings 0 on the backend
mise run format     # prettier --write over ts, tsx, md and json
mise run build      # turbo run build
```

`typecheck` and `build` both depend on `db:generate`, so a stale Prisma client is a common cause
of type errors that vanish after `mise run //packages/database:generate`.

There is no test suite in this repo. `scripts/stripe-test-clock.ts` exists for exercising
recurring payments against Stripe test clocks manually.

## Adding a tRPC module

1. Create `packages/trpc/src/modules/<name>/` with `router.ts` and `service.ts`, plus `types.ts`
   for the zod input schemas if there are more than a couple.
2. Build the router from `publicProcedure`, `protectedProcedure` or `adminProcedure` imported
   from `../../trpc`.
3. Register it on `appRouter` in `packages/trpc/src/index.ts`. The client picks up the new
   procedures through the exported `AppRouter` type with no further wiring.

## Adding a model

1. Add a `.prisma` file under `packages/database/prisma/schema/`.
2. Run `bun run db:migrate:dev` from `packages/database` — or `mise run //packages/database:push` if you are iterating
   and do not want a migration yet.
3. `mise run //packages/database:generate` if the client did not regenerate on its own.

## Gotchas

- `@repo/database` has conditional exports and resolves to a stub in the browser. Vite needs
  `@repo/database`, `@prisma/client` and `pg` in `optimizeDeps.exclude`, or the web build tries
  to bundle the Prisma engine.
- `VITE_API_URL` is read at build time. Changing the API origin means rebuilding the web app,
  not restarting it.
- Zod is `^3.24.1` everywhere in this repo. Do not upgrade a single package to v4 in isolation —
  `packages/database` generates zod 3 schemas that the tRPC inputs compose with.
- The JWT issuer and audience still default to `maxi-boilerplate-api` and
  `maxi-boilerplate-client`, inherited from the boilerplate. Tokens are not portable to other
  suite apps regardless.
