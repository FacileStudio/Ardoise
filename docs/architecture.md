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
  handlers listed above.
- `apps/web` — one SvelteKit app for both audiences. `/app/*` needs any authenticated user,
  `/admin/*` needs a space member (`MEMBER`), `/login` redirects by role, `/legal/*` is public.
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
   lazy Stripe / SMTP accessors built from the `Settings` row.
4. Procedure levels apply middleware in order: `publicProcedure` (logging only),
   `protectedProcedure` (adds `isAuthed`), `clientProcedure` (role `CLIENT`), `memberProcedure`
   (role `MEMBER`) and `platformStaffProcedure` (`PLATFORM_STAFF_SUBS`). See "Access model".
5. The error formatter logs `INTERNAL_SERVER_ERROR` with the tRPC path, and in production
   replaces the message with a generic string and strips the stack.

## Data model

Postgres 16 through Prisma. The schema is split by concern across `prisma/schema/*.prisma`.

| Model | Purpose |
|---|---|
| `User` | Accounts. `role` is `MEMBER` (every Facile SSO user), `CLIENT` (portal) or the legacy `ADMIN` (never assigned, equal to `MEMBER`); `status` is `ACTIVE`, `SUSPENDED`, `BANNED` or `PENDING`. Carries ban/suspension fields, `lastLoginAt`, `lastLoginIp` and `profileSyncedAt` (no longer written since the OIDC profile sync was removed) |
| `Client` | Billing counterparty — contact name, company, address, SIRET, VAT number, `stripeCustomerId`. Optionally linked one-to-one to a `User` for portal access |
| `Mission` | One job for one client. `status` is `DRAFT`, `QUOTED`, `ACCEPTED`, `INVOICED`, `PAID` or `CANCELLED` and follows the quote, invoice and payment events. An optional `depositPercent` allows a deposit invoice. Owns its `Prestation` lines and the `Document` and `Payment` rows linked to it through a nullable `missionId`, and links its providers through `MissionProvider` |
| `MissionProvider` | Join table between a `Mission` and a `Provider`, with a `LEAD` or `SUBCONTRACTOR` role |
| `Prestation` | A billable line of a `Mission`: `position`, `description`, `quantity`, `unit`, `unitPrice` and the optional `Provider` who carries it out. Quotes and invoices are generated from these lines |
| `Payment` | A payment request: amount, `stripeFee`, `totalWithFees`, due date, `status`, `frequency` (`ONE_TIME`/`MONTHLY`/`YEARLY`), `collectionMethod` (`STRIPE`/`MANUAL`), Stripe intent/subscription ids, receipt URL and retry counters, reminder counters. `missionId` and `documentId` (the invoice it settles) are optional |
| `PaymentInvoice` | One row per Stripe invoice on a recurring payment |
| `PaymentDocument` | Join table attaching generated `Document` rows to a `Payment` |
| `Document` | A rendered document. `type` is one of fourteen `DocumentType` values. Snapshots both client and provider legal identity at generation time, stores `items` as JSON, decimal `subtotal`/`tva`/`total`, French late-fee and recovery-fee mentions. The PDF is uploaded at creation to `documents/<id>.pdf`, and `pdfUrl` + `pdfHash` point to it: `document.download` serves that file. A `devis` carries a `version` and `acceptedAt`; an invoice built from one carries `invoiceKind` (`FULL`, `DEPOSIT`, `BALANCE`), `sourceQuoteId` and `dueDate` |
| `Provider` | The issuing legal entity — legal form, share capital, RCS city, APE code, IBAN/BIC, logo, VAT rate |
| `Space` / `SpaceMember` | Shared workspaces mirrored from Registre, one per customer. `SpaceRole` is `OWNER`, `ADMIN` or `MEMBER`. Clients, missions, documents and payments carry a required `spaceId`; a list without `spaceId` covers every space of the caller, and a mission, document or payment takes the space of its client. A provider belongs to one space; legacy providers with no space are shared by the platform studio spaces. `Space.platformStudio` marks the platform operator's own spaces |
| `Settings` | Singleton row keyed `global`: company identity, Stripe keys, SMTP credentials, outbound webhook config, bank details, VAT rate, document numbering counters and formats |
| `AdminPermission` | Per-user, per-entity `canCreate` / `canRead` / `canUpdate` / `canDelete` flags for the generic admin engine |
| `AuditLog` | `CREATE` / `UPDATE` / `DELETE` history written by the admin engine |
| `Media`, `Session`, `Account`, `Verification`, `WebhookEvent` | Avatars and covers, sessions, linked OIDC accounts, verification tokens, and processed Stripe event ids for idempotency |

Document numbering is per space. `DocumentCounter` holds one row per space and type (`invoice`,
`quote`); `withDocumentNumber` upserts it inside the same transaction as the document insert, so the
row lock serialises a space's requests and a failed insert gives the number back (continuous, no gap,
no reuse). The format comes from `SpaceSettings` (`invoiceNumberFormat`, `quoteNumberFormat`). The
global `Settings.next*Number` columns are no longer read. `SpaceSettings` also holds the payment and
legal defaults printed on documents and the space's own outbound webhook.

## Authentication

Local auth is a custom HS256 JWT scheme. `AuthManager` (`@repo/auth`) signs with `jose` using
`ENCRYPTION_SECRET`, with an issuer and audience that still default to `maxi-boilerplate-api` and
`maxi-boilerplate-client` — inherited from the boilerplate and never renamed.

- There is no password login. Staff sign in through OIDC, clients through a magic link. Both
  end in `issueSession`, which returns an access token (15 minutes) and a refresh token (7 days),
  both set as
  `HttpOnly` `SameSite=Lax` cookies. The refresh cookie is scoped to `Path=/trpc/auth.refresh`,
  so it is never sent with ordinary calls. `Secure` is added when `NODE_ENV=production`.
- Role checks come from `@repo/auth-shared`, which defines the `SessionUser` shape and a
  `ROLE_HIERARCHY` of `CLIENT: 1`, `MEMBER: 2`, `ADMIN: 2`. No role grants platform powers.

`@repo/auth` and `@repo/auth-shared` are workspace packages private to this monorepo. They were
copy-pasted from `MonorepoBoilerplate` and have drifted since; nothing imports them across repos.

### Client sign-in

Clients have no password. `User.password` is nullable and the migration nulls it for every CLIENT.
They sign in with a one-time link, built on `@facile/magiclink` (a TypeScript package with no
dependency on Prisma, tRPC or SMTP) and wired in `packages/trpc/src/modules/magic-link/`.

1. `magicLink.request({ email })` always returns `{ ok: true }`. A link is created and mailed only
   for a CLIENT with `status = ACTIVE` that is not banned or suspended. Any other email (admin,
   blocked, unknown) behaves the same way from the outside.
2. The mail points at `FRONTEND_URL/login/verify?token=<token>`. The token is 32 random bytes in
   hex. Only its sha256 hash is stored in `MagicLink.tokenHash`.
3. The verify page never signs in on GET. It reads the token, removes it from the address bar,
   and shows one button. The button calls `magicLink.consume({ token })`, a POST, so mail
   scanners that prefetch the link do not burn it.
4. `consume` marks the row used with one conditional `updateMany` (`consumedAt IS NULL AND
   expiresAt > now`), so a token works once. The module then reloads the user, requires an active
   CLIENT that passes `loginBlockReason`, and calls `issueSession` and `authCookies`. The session
   is the same as any other login: 15 minute access token, 7 day refresh cookie.
5. Unknown, expired, used and superseded tokens all return `This link is invalid or has expired`.
   A new request invalidates the user's older unused links.

There is no browser binding: a forwarded mail grants access for the link lifetime (15 minutes by
default) and one use. Requests are capped per email and per IP per hour (see
`docs/configuration.md`), on top of the strict rate-limit bucket that `magicLink.request` and
`magicLink.consume` share. The link an admin triggers by creating a client is
not counted against that client. Request and consume outcomes are logged with the user id and IP,
never the token.

There are no invitations. An admin creates the client first, then adds the user to a space with
`space.addMember`, which answers `NOT_FOUND` for an unknown email.

The verify page loads no third-party resource (no icon font or CDN), sends
`Referrer-Policy: no-referrer`, and the web server redacts the token from the URLs it logs. The
reverse proxy's own access log still sees the query string of the `GET /login/verify` request:
exclude that route from access logs if the proxy keeps them.

### OIDC

The only staff login, against Registre (`https://sso.facile.studio` in production). It activates
when `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` are set, and production refuses to
boot without them. Every sign-in sets `role = MEMBER`, which grants nothing by itself; their name
and picture come from the SSO profile on every sign-in. There is no staff password.

### Access model

Ardoise is multi-tenant by Registre space.

- A space's members and their `OWNER` / `ADMIN` / `MEMBER` roles come only from Registre's directory
  (`apps/backend/src/registre/spaces.ts`). Every space-scoped query takes its space from the
  caller's `SpaceMember` rows (`spaceService.resolveScope`, `requireRowScope`), never from a client
  id alone. A row of another space answers `NOT_FOUND` or `FORBIDDEN`.
- An unlinked local space is adopted by a Registre space of the same name only when its local
  owners all own that Registre space. Otherwise the Registre space gets a fresh Ardoise space.
- Platform staff are the Registre subjects in `PLATFORM_STAFF_SUBS`. Only they reach the platform
  `Settings` (company, Stripe keys, SMTP, outbound webhook, numbering), the generic `admin.*`
  engine and audit logs, `/admin/offres` and `billing.*`, `space.setPlatformStudio`, and writes to
  shared providers. One middleware (`platformStaffProcedure`) decides it; an empty list means nobody.
- `Space.platformStudio` marks the platform operator's own spaces. Only those may collect Stripe
  payments on the platform account, mail their clients through the platform SMTP (payment
  requests, reminders, welcome and magic links), send contracts to Plume, archive them in Nuage
  and use the shared providers. The platform webhook only hears their events. Other spaces keep
  manual payments, documents and their own providers. The check lives in the function that spends
  the resource (`generateAndSendReceipt`, `createPayment`, `sendReminder`, `cancelPayment`,
  `ensureClientSignUrl`, `dispatchConfiguredWebhook`, ...), so every caller inherits it. Staff flip the flag with `space.setPlatformStudio`, which writes an audit row.
- CLIENT portal accounts are unchanged: magic links, scoped to their own `Client` row.

Code lives in `apps/backend/src/oidc/`, one job per file:

| File | Job |
|---|---|
| `config.ts` | Builds the config from env, with defaults for the redirect and success URLs |
| `provider.ts` | Discovery and JWKS, cached for an hour, issuer must match `OIDC_ISSUER` |
| `state.ts` | Signed `oidc_state` cookie holding state, nonce, PKCE verifier and the validated redirect |
| `flow.ts` | `startLogin` and `finishLogin`: authorization code + PKCE (S256), nonce check, id token verification. No Hono, no Prisma |
| `identity.ts` | Claims to user. Only existing users can sign in |
| `avatar.ts` | Copies the `picture` claim into storage when the user has no avatar |
| `routes.ts` | The three HTTP routes, glue only |

Identity rules, in `identity.ts`:

1. `Account(providerId = issuer, accountId = sub)` is the link. A match signs the user in.
2. No link: the id token must carry `email_verified: true`, and a `User` with that email must
   already exist (an admin created it). The link is then written, `emailVerified` becomes true,
   and legacy `providerId = 'oidc'` rows (which held plaintext tokens) are deleted.
3. No such user: refused with `not_invited`. A user already linked to a different `sub` for this
   issuer is refused with `identity_conflict`. Banned or suspended users get `blocked`.

Roles are never read from claims; `User.role` only changes in the admin panel. The browser lands on
`OIDC_SUCCESS_URL` with `?oidc=success` or `?error=<code>`, and the session cookies are the same
ones `modules/auth` issues (`issueSession` and `authCookies` in `packages/trpc`).

## Integrations

- **Stripe.** Keys come from the `Settings` row, not the environment. `POST /webhook` verifies the
  signature and records handled event ids in `WebhookEvent` for idempotency. Recurring payments use
  subscriptions; one-off payments use Payment Intents plus a client secret fetched by the public
  `payment.getClientSecret` procedure.
- **SMTP.** Nodemailer, configured from `Settings`. Sends the payment request, reminders, and the
  receipt.
- **Space webhook.** `SpaceSettings.webhookUrl` / `webhookSecret` (encrypted) / `webhookEvents`, set by a space admin, hear that space's events through the same signer (`x-ardoise-signature-256`). `webhook/outbound.ts` refuses non-https URLs, credentials in the URL and any name that resolves to a private, loopback, link-local or reserved address, connects to the address it checked, times out at 5 s and never follows a redirect.
- **Outbound webhooks.** `Settings.webhookUrl` / `webhookSecret` / `webhookEvents` feed the
  `webhook` service. Events sent today: `client.created`, `client.updated`, `client.deleted`,
  `mission.created`, `mission.updated`, `mission.prestations_updated`,
  `mission.quote_generated`, `mission.quote_accepted`, `mission.invoice_generated`,
  `mission.status_changed`, `mission.payment_created` and `mission.deleted`. The moves of a
  mission status that follow those events, including the automatic move to `PAID`, send no
  event of their own.

- **Glouton.** Optional two-way client sync with the suite contacts database (`GLOUTON_*`,
  `packages/glouton`). Ardoise sends `client.created`, `client.updated`, `client.deleted` and the
  four `mission.quote_generated`, `quote_accepted`, `invoice_generated`, `payment_created` events
  to `{GLOUTON_URL}/api/integrations/ardoise/webhook`, signed with `X-Ardoise-Signature-256`
  (`sha256=` HMAC of the raw body). Delivery runs after the response, with up to three retries on
  network errors, 429 and 5xx. Mission events carry `clientId`, `missionTitle`, `amountCents`,
  `currency` (`EUR`) and the quote or invoice number. Glouton writes back through
  `/api/integrations/glouton/clients` (see `api.md`), matched on `Client.gloutonCompanyId`, with
  last write wins on `updatedAt`; the space comes from `registreSpaceId`. Those writes are never
  sent back to Glouton. A delete on either side only unlinks. A linked client shows a "Lié dans
  Glouton" badge on its admin page.

Ardoise does **not** use `pool` or `enveloppe`, and does not ship events to Nook or Journal.

## Storage

`StorageService` writes to `STORAGE_PATH` on disk (`/data/uploads` in the container, on a named
volume). Uploads are not pre-signed S3 URLs: the server mints an HMAC ticket with
`createStorageTicket`, the client `PUT`s to `/storage/<key>?ticket=…`, and
`verifyStorageTicket` checks the method and key before accepting the body. Downloads use the same
scheme with `GET`.
