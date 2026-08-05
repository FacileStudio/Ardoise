# Ardoise — Development

Getting a working local Ardoise, the database workflow, and the checks to run before you push.

## Prerequisites

- **Bun 1.2.0 or newer.** `packageManager` pins `bun@1.2.0`; the Docker images build on
  `oven/bun:1.3.7`. No npm, yarn or pnpm — the lockfile is `bun.lock`
- **PostgreSQL 16**, either locally or via `docker compose up -d ardoise-postgres`
- **`just`**, the task runner for this repo. Ardoise uses a `justfile`, not `mise.toml`
- **`typst` 0.13** on `PATH` if you want document generation to work outside Docker. The
  container copies the binary from `ghcr.io/typst/typst:v0.13.1`

## Setup

```sh
just init
```

That runs `bun install`, generates the Prisma client, creates a local `ardoise` database, and
pushes the schema with `--accept-data-loss`. It assumes
`postgresql://user@localhost:5432/ardoise`; edit the `justfile` or export `DATABASE_URL` if your
local Postgres differs.

You still need a backend environment. The required variables are `NODE_ENV`, `DATABASE_URL`,
`ENCRYPTION_SECRET` (32+ characters), `ADMIN_EMAIL` and `ADMIN_PASSWORD` — see
[configuration.md](configuration.md). The backend refuses to start without them.

## Running

```sh
just dev        # backend and web together, through Turborepo
just backend    # backend only, port 3001
just web        # web only, port 3000
```

`just dev` is `bun run dev`, which is `turbo run dev`. The `dev` task depends on `db:generate`
and `check-env`, so Turbo regenerates the Prisma client and validates the environment before
either app comes up.

The backend calls `bootstrapAdmin()` on startup, so the account from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` always exists — there is no separate seeding step for logging in. `just
create-admin` exists as a manual fallback and writes the development default
`admin@example.com` / `admin123456789`.

Once running: the web app is at <http://localhost:3000> (client portal `/app`, admin panel
`/admin`), the API at <http://localhost:3001>, and interactive API reference at
<http://localhost:3001/docs>.

## Database workflow

The schema is split across `packages/database/prisma/schema/*.prisma`; `prisma.config.ts` points
Prisma at the directory rather than a single file.

```sh
just generate                          # prisma generate + zod-prisma-types
just push                              # prisma db push, development only
just studio                            # Prisma Studio

cd packages/database
bun run db:migrate:dev                 # create a migration
bun run db:migrate:deploy              # apply migrations, what production runs
bun run db:seed                        # scripts in prisma/seed.ts
```

`db:generate` deletes `packages/database/src/zod` and regenerates it, then runs
`scripts/patch-zod-types.ts`. Two generators run: `prisma-client-js` and `zod-prisma-types`.

## Quality gate

There is no `scripts/check.sh`, no `.githooks/`, and no CI. GitHub Actions was removed
suite-wide. Run the checks yourself:

```sh
just typecheck    # turbo run typecheck — tsc for the backend, svelte-check for the web app
just lint         # turbo run lint — eslint with --max-warnings 0 on the backend
just format       # prettier --write over ts, tsx, md and json
just build        # turbo run build
```

`typecheck` and `build` both depend on `db:generate`, so a stale Prisma client is a common cause
of type errors that vanish after `just generate`.

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
2. Run `bun run db:migrate:dev` from `packages/database` — or `just push` if you are iterating
   and do not want a migration yet.
3. `just generate` if the client did not regenerate on its own.

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
