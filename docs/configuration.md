# Ardoise — Configuration

Every environment variable the code actually reads, plus the settings that deliberately live in
the database instead.

## Backend

Validated by `serverEnvSchema` in `packages/env/src/index.ts`, parsed at startup by
`apps/backend/src/lib/env.ts`. **A missing or invalid required variable prints the failing paths
and exits 1** — the process does not start degraded.

| Variable | Required | Default | What it does |
|---|---|---|---|
| `NODE_ENV` | yes | — | `development`, `production` or `test`. Turns on `Secure` cookies and generic error messages in production |
| `PORT` | no | `3001` | HTTP listen port, coerced to a number |
| `BACKEND_URL` | no | `http://localhost:3001` | Public API origin. Must be a URL; a trailing slash is stripped. Also the public base for storage URLs and an allowed CORS origin |
| `FRONTEND_URL` | no | `http://localhost:3000` | Public web origin. Allowed CORS origin, and the default OIDC success redirect |
| `ENCRYPTION_SECRET` | yes | — | Minimum 32 characters. Signs access and refresh JWTs, keys `@repo/crypto`, and signs storage tickets |
| `STORAGE_PATH` | no | `./data/uploads` | Directory the filesystem object store writes to |
| `OIDC_ISSUER` | in production | — | Facile SSO issuer. Staff sign in only through it. Needs `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` |
| `MAGIC_LINK_TTL_MINUTES` | no | `15` | Lifetime of a client sign-in link, 1 to 1440 |
| `MAGIC_LINK_MAX_PER_EMAIL_HOUR` | no | `5` | Link requests per client email per hour. Extra requests are dropped silently |
| `MAGIC_LINK_MAX_PER_IP_HOUR` | no | `20` | Link requests per source IP per hour |
| `DATABASE_URL` | yes in practice | see below | Postgres connection string. Read directly by `packages/database/src/index.ts` and `prisma.config.ts` |

`DATABASE_URL` is the one variable outside the zod schema, so it does not fail fast. Instead it
falls back — to `postgresql://localhost:5432/ardoise` in the runtime client and to
`postgresql://postgres:postgres@postgres:5432/ardoise` in the Prisma CLI config. Always set it
explicitly; a typo silently connects somewhere else rather than erroring.

### Cookies

| Variable | Required | Default | What it does |
|---|---|---|---|
| `COOKIE_DOMAIN` | no | — | Adds `Domain=` to the auth cookies. Set it only when the web app and API are on different subdomains of one base domain (the web server's `/admin` guard reads the cookie). Use the narrowest shared parent, for example `.ardoise.facile.studio` for `ardoise.facile.studio` and `api.ardoise.facile.studio` |

### OIDC

All optional. OIDC turns on when `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` are set;
startup fails if the issuer is set without the other two. Empty strings count as unset.

| Variable | Required | Default | What it does |
|---|---|---|---|
| `OIDC_ISSUER` | no | — | Issuer URL, for example `https://sso.facile.studio` |
| `OIDC_CLIENT_ID` | no | — | Client id registered in Registre |
| `OIDC_CLIENT_SECRET` | no | — | Client secret registered in Registre |
| `OIDC_REDIRECT_URL` | no | `BACKEND_URL/auth/oidc/callback` | Must match the redirect registered in Registre exactly |
| `OIDC_SUCCESS_URL` | no | `FRONTEND_URL/login` | Where the browser lands after a successful callback |

### Nuage, Plume and Glouton

All optional, each all-or-nothing: setting some variables of a group without the others fails the
boot. Empty values count as unset.

| Variable | Description |
|---|---|
| `NUAGE_URL`, `NUAGE_API_TOKEN`, `NUAGE_SPACE_FACILE_ID` | Archive generated contract PDFs in a Nuage space. Fire and forget: a Nuage failure is logged and never blocks document creation |
| `NUAGE_SPACE_NAME` | Name used when Nuage creates the space. Defaults to `Ardoise` |
| `PLUME_URL`, `PLUME_API_TOKEN`, `PLUME_WEBHOOK_SECRET` | Send contracts for signature. The secret (16+ characters) signs `POST /webhooks/plume` |
| `GLOUTON_URL` | Glouton base URL. Ardoise posts events to `{GLOUTON_URL}/api/integrations/ardoise/webhook` and links client pages to `{GLOUTON_URL}/app/contacts/companies/{id}` |
| `GLOUTON_API_TOKEN` | Bearer token Glouton sends on `/api/integrations/glouton/*`. Same value as Glouton's `ARDOISE_API_TOKEN` |
| `GLOUTON_WEBHOOK_SECRET` | 16+ characters. Signs outbound events in `X-Ardoise-Signature-256`. Same value as Glouton's `ARDOISE_WEBHOOK_SECRET` |

### Suite billing (forfait)

| Variable | Default | What it does |
|---|---|---|
| `PLATFORM_STAFF_SUBS` | empty | Comma-separated Registre subjects of the platform operators. Only an active, unbanned, non-client account whose Facile SSO identity (`Account` with `providerId` = `OIDC_ISSUER`) has a listed subject reaches the platform settings (Stripe, SMTP), the `admin.*` engine, audit logs, `/admin/offres`, `billing.*`, `space.setPlatformStudio` and shared providers. Empty (with no email fallback) means nobody: set it before deploying v0.14.0 |
| `PLATFORM_STAFF_EMAILS` | empty | Fallback, trimmed and case-insensitive. Matches the email Registre's snapshot holds for the user's subject, and only when the snapshot marks it `email_verified: true`. Today's snapshot carries no verification flag, so set `PLATFORM_STAFF_SUBS`. `User.email` is never consulted |
| `BILLING_STAFF_SUBS`, `BILLING_STAFF_EMAILS` | empty | Deprecated aliases, merged with the two `PLATFORM_STAFF_*` lists |
| `BILLING_SEED_COMP_SUBS` | empty | `email=sub` pairs. The seed gives the comped owners these Registre subjects when theirs is missing. Comps match by subject only (or a verified snapshot email), so a comp without one grants nothing |
| `BILLING_API_TOKEN` | unset | Bearer token on `GET /billing/spaces/:id`, `POST /billing/checkout` and `POST /billing/portal`. Same value as Registre's. Only its SHA-256 digest is kept and compared in constant time. Missing or shorter than 32 characters: the routes answer 404 |
| `BILLING_REDIRECT_ORIGINS` | `https://sso.facile.studio` | Comma-separated https origins. `success_url`, `cancel_url` and `return_url` must be absolute https URLs on one of them, without credentials |
| `BILLING_SEED_ON_BOOT` | `false` | `true` runs the billing seed at boot (six features, draft Solo/Pro/Studio, comped owners). Idempotent; it never edits existing rows |

The entitlement push reuses `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`: Ardoise
sends `PUT {OIDC_ISSUER}/api/directory/entitlements` with HTTP Basic, so Registre's
`ENTITLEMENTS_WRITER` must equal Ardoise's client id. Without the OIDC variables the push is
disabled and logged once at boot.

## Web

| Variable | Required | Default | What it does |
|---|---|---|---|
| `PORT` | no | `3000` | Listen port for the SvelteKit node adapter. Set in the image |
| `NODE_ENV` | no | — | Read by `apps/web/src/lib/env.ts` and the client logger |
| `VITE_API_URL` | yes | — | Origin the browser calls for tRPC. **Baked in at build time** — Docker Compose passes `BACKEND_URL` as a build arg |
| `LOG_PRETTY` | no | — | Set to `1` by the `dev` scripts for human-readable logs |

## Compose

`docker-compose.yml` reads these from the shell or a root `.env`; see `.env.production.example`.

| Variable | Default | What it does |
|---|---|---|
| `POSTGRES_USER` | `postgres` | Database user, also used to build `DATABASE_URL` for the backend service |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_DB` | `ardoise` | Database name |

The backend service's `DATABASE_URL` is assembled from those three and always points at the
`ardoise-postgres` service; it is not settable directly in Compose.

## Settings that are not environment variables

Everything below is stored in the `Settings` table (a singleton row with `id = "global"`) and
edited from `/admin/settings`. Putting them in the environment has no effect.

- **Company identity** — `companyName`, `companyLegal`, address fields, `companySiret`,
  `companyTvaIntracom`, `companyLegalForm`, `companyShareCapital`, `companyRcsCity`,
  `companyApeCode`, `companyEmail`, `companyPhone`, `logoUrl`
- **Stripe** — `stripeSecretKey` (must start `sk_`), `stripePublishableKey` (`pk_`),
  `stripeWebhookSecret` (`whsec_`)
- **SMTP** — `smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`, `smtpFrom`
- **Outbound webhooks** — `webhookUrl`, `webhookSecret`, `webhookEvents`
- **Banking** — `bankName`, `iban`, `bic`
- **Billing defaults** — `tvaRate` (default 20), `defaultPaymentTermsDays` (30),
  `defaultLateFeeRate`, `defaultRecoveryFeeAmount` (40), `defaultVatExemptionMention`
- **Numbering** — `nextInvoiceNumber`, `nextQuoteNumber`, `nextContractNumber` and the matching
  `*NumberFormat` templates, defaulting to `FAC-{{year}}-{{number}}`,
  `DEVIS-{{year}}-{{number}}` and `CONT-{{year}}-{{number}}`

Ardoise does not use `tronc` or `troncenv`; the Go chassis conventions do not apply here.
