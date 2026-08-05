# Ardoise — Architecture

How the containers, the request path, the data model and the authentication flows fit together.

## Runtime topology

Ardoise ships as **two** containers, not one: the SvelteKit server and the Hono API are separate
services with separate hostnames. The browser talks to both directly.

```
                    ┌──▶ ardoise-web  (:3000)  SvelteKit node adapter
Internet ──▶ Traefik ┤                          renders /app and /admin
                    │
                    └──▶ ardoise-backend (:3001) Hono
                              ├──▶ /trpc/*     tRPC fetch adapter, the whole API
                              ├──▶ /auth/*     OIDC login, callback, profile sync
                              ├──▶ /storage/*  ticket-signed upload and download
                              ├──▶ /webhook    Stripe events (raw body, signed)
                              └──▶ /health     liveness, readiness, dependency probe
                                        │
                                   Postgres 16          /data/uploads volume
```

The web container is built with `VITE_API_URL` baked in at image build time, taken from
`BACKEND_URL`. Changing the API hostname therefore requires a rebuild of the web image, not just
a restart.

## Components

- `apps/backend` — Hono app. Wires CORS, request logging, three rate-limit tiers, then mounts the
  handlers listed above. Its entry point calls `bootstrapAdmin()` before serving, so the admin
  account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` always exists.
- `apps/web` — one SvelteKit app for both audiences. `/app/*` needs any authenticated user,
  `/admin/*` needs `ADMIN`, `/login` redirects by role, `/legal/*` is public.
- `packages/trpc` — the API itself. Eleven module directories, each with `router.ts` and
  `service.ts`. The router is exported as `appRouter`; `AppRouter` is the type the client imports.
- `packages/database` — Prisma with a multi-file schema under `prisma/schema/`. A second
  generator (`zod-prisma-types`) emits zod schemas into `src/zod`.
- `packages/typst` — renders documents through the `typst` binary, which is copied into the
  backend image from `ghcr.io/typst/typst:v0.13.1`.
- `packages/storage` — a local filesystem object store under `STORAGE_PATH`. Despite what older
  notes say, there is no MinIO or S3 client in the tree.

## Request lifecycle

1. Traefik routes to the web or the backend container by hostname.
2. On the backend, `corsHandler([FRONTEND_URL, BACKEND_URL])` runs first, then the logger
   middleware, then rate limiting: a stricter bucket for `/trpc/auth.*`, another for
   `/trpc/payment.*`, and a general bucket for everything else under `/trpc/*`.
3. `createContext` reads the `auth_token` cookie, falling back to an `Authorization: Bearer`
   header, and verifies it with `AuthManager.verifyToken`. The resulting user is attached to the
   context along with `db`, `storage`, `env`, a child logger, the request IP and user agent, and
   lazy Stripe / SMTP / DocuSeal accessors built from the `Settings` row.
4. Three procedure levels apply middleware in order: `publicProcedure` (logging only),
   `protectedProcedure` (adds `isAuthed`), `adminProcedure` (adds `isAdmin`, which calls
   `hasAccess(ctx.user, UserRole.ADMIN)`).
5. The error formatter logs `INTERNAL_SERVER_ERROR` with the tRPC path, and in production
   replaces the message with a generic string and strips the stack.

## Data model

Postgres 16 through Prisma. The schema is split by concern across `prisma/schema/*.prisma`.

| Model | Purpose |
|---|---|
| `User` | Accounts. `role` is `ADMIN` or `CLIENT`; `status` is `ACTIVE`, `SUSPENDED`, `BANNED` or `PENDING`. Carries ban/suspension fields, `lastLoginAt`, `lastLoginIp` and `profileSyncedAt` |
| `Client` | Billing counterparty — contact name, company, address, SIRET, VAT number, `stripeCustomerId`. Optionally linked one-to-one to a `User` for portal access |
| `Payment` | A payment request: amount, `stripeFee`, `totalWithFees`, due date, `status`, `frequency` (`ONE_TIME`/`MONTHLY`/`YEARLY`), `collectionMethod` (`STRIPE`/`MANUAL`), Stripe intent/subscription ids, receipt URL and retry counters, reminder counters |
| `PaymentInvoice` | One row per Stripe invoice on a recurring payment |
| `PaymentDocument` | Join table attaching generated `Document` rows to a `Payment` |
| `Document` | A rendered document. `type` is one of thirteen `DocumentType` values. Snapshots both client and provider legal identity at generation time, stores `items` as JSON, decimal `subtotal`/`tva`/`total`, French late-fee and recovery-fee mentions, and `pdfUrl` + `pdfHash` |
| `Provider` | The issuing legal entity — legal form, share capital, RCS city, APE code, IBAN/BIC, logo, VAT rate |
| `Space` / `SpaceMember` | Shared workspaces. `SpaceRole` is `OWNER`, `ADMIN` or `MEMBER`. Clients, documents, payments and providers all carry an optional `spaceId` |
| `Settings` | Singleton row keyed `global`: company identity, Stripe keys, SMTP credentials, DocuSeal credentials, outbound webhook config, bank details, VAT rate, document numbering counters and formats |
| `AdminPermission` | Per-user, per-entity `canCreate` / `canRead` / `canUpdate` / `canDelete` flags for the generic admin engine |
| `AuditLog` | `CREATE` / `UPDATE` / `DELETE` history written by the admin engine |
| `Media`, `Session`, `Account`, `Verification`, `WebhookEvent` | Avatars and covers, sessions, linked OIDC accounts, verification tokens, and processed Stripe event ids for idempotency |

Document numbering is driven from `Settings`: `nextInvoiceNumber`, `nextQuoteNumber` and
`nextContractNumber` counters formatted through `invoiceNumberFormat`, `quoteNumberFormat` and
`contractNumberFormat`, all defaulting to a `{{year}}` / `{{number}}` template.

## Authentication

Local auth is a custom HS256 JWT scheme. `AuthManager` (`@repo/auth`) signs with `jose` using
`ENCRYPTION_SECRET`, with an issuer and audience that still default to `maxi-boilerplate-api` and
`maxi-boilerplate-client` — inherited from the boilerplate and never renamed. Passwords are hashed
with argon2 through `@repo/crypto`.

- `auth.login` returns an access token (15 minutes) and a refresh token (7 days), both set as
  `HttpOnly` `SameSite=Lax` cookies. The refresh cookie is scoped to `Path=/trpc/auth.refresh`,
  so it is never sent with ordinary calls. `Secure` is added when `NODE_ENV=production`.
- Role checks come from `@repo/auth-shared`, which defines the `SessionUser` shape and a
  `ROLE_HIERARCHY` of `CLIENT: 1`, `ADMIN: 2`. Note this is **not** the boilerplate's
  `USER`/`ADMIN` pair — Ardoise renamed the lower role to `CLIENT`.

`@repo/auth` and `@repo/auth-shared` are workspace packages private to this monorepo. They were
copy-pasted from `MonorepoBoilerplate` and have drifted since; nothing imports them across repos.

### OIDC

`createOIDCRoutes` mounts an optional Authentik client. It activates only when `OIDC_ISSUER`,
`OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_REDIRECT_URL` are all set.

- `GET /auth/config` reports whether OIDC is enabled and whether `SSO_ONLY` is on, so the login
  page can hide the password form.
- `GET /auth/oidc` starts the flow; `GET /auth/oidc/callback` exchanges the code, upserts the
  local `User`, and issues the same cookies as a password login.
- `POST /auth/sync-profile` pushes profile changes back, rate-limited by `profileSyncedAt`.
- With `SSO_ONLY=true`, `user.create` refuses to run.

## Integrations

- **Stripe.** Keys come from the `Settings` row, not the environment. `POST /webhook` verifies the
  signature and records handled event ids in `WebhookEvent` for idempotency. Recurring payments use
  subscriptions; one-off payments use Payment Intents plus a client secret fetched by the public
  `payment.getClientSecret` procedure.
- **SMTP.** Nodemailer, configured from `Settings`. Sends the payment request, reminders, and the
  receipt.
- **DocuSeal.** Optional e-signature backend, also configured from `Settings`; the `docuseal`
  module proxies submissions, templates and submitters.
- **Outbound webhooks.** `Settings.webhookUrl` / `webhookSecret` / `webhookEvents` feed the
  `webhook` service.

Ardoise does **not** use `pool` or `enveloppe`, and does not ship events to Nook or Journal.

## Storage

`StorageService` writes to `STORAGE_PATH` on disk (`/data/uploads` in the container, on a named
volume). Uploads are not pre-signed S3 URLs: the server mints an HMAC ticket with
`createStorageTicket`, the client `PUT`s to `/storage/<key>?ticket=…`, and
`verifyStorageTicket` checks the method and key before accepting the body. Downloads use the same
scheme with `GET`.
