# Ardoise — Deployment

Building the images, the Compose topology, and what Dokploy and Traefik need in front of them.

## Images

Two Dockerfiles, both multi-stage and both installing from the root `bun.lock` with a synthesized
`package.json` that lists only the workspaces that service needs.

**`apps/backend/Dockerfile`** — base `oven/bun:1.3.7`. Copies the `typst` binary from
`ghcr.io/typst/typst:v0.13.1` into `/usr/local/bin/typst`, runs `db:generate` in the builder
stage, and runs as an unprivileged `backend` user (uid 1001). Creates `/data/uploads` owned by
that user. Exposes `3001`. Its command runs `db:migrate:deploy` and then starts the server:

```sh
cd /app/packages/database && bun run db:migrate:deploy && cd /app && bun run apps/backend/src/index.ts
```

**`apps/web/Dockerfile`** — base `oven/bun:1.3.7-alpine`. Takes `VITE_API_URL` as a build arg,
builds the SvelteKit node adapter output, and ships only `build/`, `package.json` and
`node_modules` in the runner stage. Runs as `web` (uid 1001), exposes `3000`, `CMD ["node",
"build"]`.

Because `VITE_API_URL` is a build arg, the API hostname is compiled into the client bundle. A
new API hostname means a rebuild.

## Compose topology

```
ardoise-postgres  postgres:16-alpine, named volume postgres_data, pg_isready healthcheck
      ▲
      │ depends_on: service_healthy
ardoise-backend   built from apps/backend/Dockerfile, expose 3001, volume uploads_data:/data/uploads
      ▲
      │ depends_on
ardoise-web       built from apps/web/Dockerfile, expose 3000, build arg VITE_API_URL=$BACKEND_URL
```

The base `docker-compose.yml` uses `expose`, not `ports`, so nothing binds a host port — that is
what lets a reverse proxy route to the containers on a shared network.
`docker-compose.override.yml` publishes `5432`, `3001` and `3000` and is picked up automatically
by `docker compose up` locally. **Do not deploy with the override file**; it would expose Postgres
on the host.

Both app services set `restart: unless-stopped`.

```sh
cp .env.production.example .env
docker compose up -d
docker compose logs -f ardoise-backend
docker compose down
```

## Environment for a real deployment

At minimum: `NODE_ENV=production`, `ENCRYPTION_SECRET` (32+ random characters),
`OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
`BACKEND_URL` and `FRONTEND_URL` set to the real public origins. See
[configuration.md](configuration.md) for the full list and the fail-fast behavior.

Stripe keys, SMTP credentials and company details are configured in `/admin/settings` after the
first boot, not through the environment.

## Dokploy and Traefik

Ardoise is deployed on la ruche through the Dokploy panel at `gare.facile.studio`, as a Compose
application. Prefer the `dokploy` CLI over SSH plus docker.

Ardoise is the suite's exception to the one-container / one-router / one-hostname rule: it needs
**two** Traefik routers, one per service.

- `ardoise-web` on the primary hostname, port `3000`
- `ardoise-backend` on a separate hostname, port `3001`

`.env.production.example` uses `ardoise.facile.studio` and `backend-ardoise.facile.studio` for
those two. Both hostnames must be listed as `FRONTEND_URL` and `BACKEND_URL` respectively,
because `corsHandler([FRONTEND_URL, BACKEND_URL])` builds the CORS allow-list from exactly those
two values — a mismatch shows up as browser CORS failures, not as a server error.

Order of operations when the API hostname changes: set `BACKEND_URL`, **rebuild** the web image
so `VITE_API_URL` is correct, then redeploy. Restarting alone will not do it.

## Migrations

Migrations are applied by the backend container's own command, before the server starts. There is
no separate migration job. A failed migration therefore fails the container start, which is the
intended behavior — the service does not come up against a schema it does not expect.

Migration files live in `packages/database/prisma/migrations/`. Never use `db push` against a
deployed database; it is a development-only shortcut that can drop columns.

## Health checks

| Path | Purpose |
|---|---|
| `GET /health` | Full probe. Reports `healthy`, `degraded` or `unhealthy` with per-service status and latency for `api`, `database` (a `SELECT 1`) and `storage` (a directory listing) |
| `GET /health/live` | Liveness — the process is up |
| `GET /health/ready` | Readiness — dependencies are reachable |
| `GET /version` | `{ "version" }`: the `version` of the root `package.json`, baked into the image at build time |

Point the container healthcheck at `/health/ready` and the Traefik or uptime probe at `/health`.
Note that a green `/health` says nothing about the **web** container: it is a separate service on
a separate hostname, and must be probed on its own.

## Persistent state

Two volumes matter. `postgres_data` holds the database. `uploads_data` is mounted at
`/data/uploads` and holds every uploaded file, generated PDF and logo — it is not reconstructible
from the database, since only paths and hashes are stored there. Back up both.
