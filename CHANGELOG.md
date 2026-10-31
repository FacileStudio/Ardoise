# Changelog

All notable changes to this project are documented here. The format is
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While on
`0.x`, a breaking change bumps the minor.

Releases are tagged `v*` on `main`. A tag does not deploy anything. Production
runs the Compose stack on Dokploy (`docker-compose.yml`, one backend and one web
container behind Traefik), which auto-deploys on every push to `main`.
`apps/*/railway.toml` still describe Railway builds from the Dockerfiles. Neither
deploys from the tag. A tag publishes the backend image to
`ghcr.io/facilestudio/ardoise` and creates the GitHub release.

## [Unreleased]

### Changed

- `apps/web` now compiles with `strict: true`, so the tRPC types it reads from `@repo/trpc` match
  the backend. `typecheck` and `lint` cover `@repo/web` in CI and in the release workflow.

### Fixed

- Client and provider pickers called a missing `admin.providers` endpoint and an unsupported
  `offset` input, and read the wrong response keys. They now use `provider.list` and `client.list`.
- Creating a maintenance contract navigated to `/admin/documents/undefined`. It now uses the
  returned document id.
- The admin entity search box listened with `on:input`, which Svelte 5 components never fire. It
  now passes `oninput`.
- Invoice and quote previews no longer send `invoice_number` and `quote_number`, which the
  procedures do not accept.
- `**/*.svelte.ts` files parse with the TypeScript parser in the shared ESLint config, and empty
  catch blocks and `logger.error` calls with the wrong signature are fixed.

## [0.2.2] - 2026-10-31

### Added

- `SSO_ONLY` mode: staff (role ADMIN) sign in through SSO only, password login stays for CLIENT accounts. Needs `OIDC_ISSUER`, and `ADMIN_PASSWORD` becomes optional.
- `ADMIN_MIGRATE_FROM`: with `SSO_ONLY`, the legacy admin is renamed to `ADMIN_EMAIL` (same id, data and linked accounts, sessions revoked), or disabled when `ADMIN_EMAIL` already exists.
- `GET /auth/config` returns `sso_only` and `password_login`.

### Changed

- With `SSO_ONLY`, the boot-time admin bootstrap never sets a password and never resets other users.
- The login page shows SSO failures above the form, and labels the password form as client access in SSO-only mode.

### Security

- With `SSO_ONLY`, `auth.login` refuses every non-CLIENT user with the same error and hashing work as a wrong password.
- `auth.login` now hashes against a decoy for unknown emails, so response time no longer reveals whether an account exists.
- With `SSO_ONLY`, invitations for staff cannot be created or accepted, so no anonymous visitor can create a staff account with a password.

## [0.2.1] - 2026-10-31

### Fixed

- Generating a barman, design, dev, formation or BTP service invoice no longer fails with "Unknown document type". All seven service types now share one validation schema.

## [0.2.0] - 2026-10-31

### Added

- Optional Nuage archive: contract PDFs (`contrat_prestation`, `contrat_maintenance`,
  `back_contractuel`) are uploaded to a Nuage space when `NUAGE_*` is set, without blocking
  document creation.
- Optional Plume signature link: `document.sendForSignature`, `POST /webhooks/plume`, signature
  columns on `Document` (migration `20261030120000_add_document_signature_link`), and a status
  badge plus a "send for signature" action on the documents list and the mission page.
- `docker-compose.yml` passes the `NUAGE_*` and `PLUME_*` variables to the backend.

### Fixed

- A single provider, feature or payment provider no longer breaks the `back_contractuel` and
  `appel_de_fonds` templates.
- Typst escaping also covers newlines, tabs and control characters, and the compile has a
  60 second timeout with piped output.

### Changed

- Both Dockerfiles include the `nuage` and `plume` workspaces.

## [0.1.0] - 2026-10-30

First versioned release. It records what exists on `main`; earlier work was not
tagged.

### Added

- Payment requests: an admin creates a payment for a client, the client is emailed a link and
  pays through Stripe Elements. Recurring payments handle failed and past-due invoices, keep an
  invoice history, open the billing portal and retry receipts. Webhooks are idempotent.
- Missions: one job for one client, with billable prestation lines. Quotes (devis) are generated
  from the lines and versioned, an accepted quote becomes a full invoice or a deposit and a
  balance, and the mission status follows quotes, invoices and payments.
- Documents: fourteen document types (devis, invoices, contracts, service documents) with
  automatic numbering, rendered to PDF with Typst. The PDF is stored at creation and served by
  `document.download`. Documents attach to payments and link to a mission.
- Providers with logos, and clients with optional address fields and portal access decoupled
  from the client record. A client can be copied or moved to another space.
- Spaces: rows belong to a space, with roles and member management, scoped so that a write
  without a space cannot be expressed.
- Invitations: invite admins and space members by email, with a modal that explains a missing
  SMTP configuration.
- Authentication: cookie-based sessions with an optional `COOKIE_DOMAIN`, per-route rate
  limiting, and optional invite-only SSO through OIDC (Registre), keyed on `(issuer, sub)`.
  Password login always stays on.
- Admin panel and client portal in one SvelteKit app, in English and French.
- Settings stored in the database, with secrets encrypted at rest.
- Payment reminders and email notifications over SMTP, and outbound webhook events for
  clients and missions.
- A demo dataset seeded through the real services.
- API reference at `/docs` and the OpenAPI document at `/docs/openapi.json`.
- Health endpoints `/health`, `/health/live` and `/health/ready`.
- `GET /version` returns the release tag or commit the image was built from, or `dev`.
- Docker images for the backend and the web app, a Compose stack with Postgres, and a Railway
  config for each image.
- GitHub workflows: `filet` code-quality check, CI (typecheck and lint), and a tag-driven
  release that publishes the image and the GitHub release.
- `CHANGELOG.md` and a root `package.json` version as the version source of truth.

### Changed

- The project was renamed from Charles to Ardoise, and the separate client and backoffice apps
  were merged into one web app.
- The `Prestation` aggregate became `Mission`, and the `prestation` invoice document type
  became `facture_prestation`.
- The web app moved from `@repo/ui` to `@facile/muse`.
- Storage moved from MinIO to a local filesystem object store with ticket-signed uploads.
- Prisma migrations run before the backend starts, through the Dockerfile command and the
  Railway pre-deploy hook.
- The task runner moved from `just` to `mise`.

### Fixed

- Internal errors are sanitized in production, the storage upload requires a ticket, and the
  admin guard runs on the server.
- CORS preflight handling, storage permissions in the container, and the Typst binary path in
  the backend image.
- Refresh tokens are unique, so two logins in the same second no longer collide.
- `@hono/trpc-server` no longer replaces `ctx.env` with an empty object.
- The web build no longer loads `pino-pretty` unless `LOG_PRETTY` is set.
- The payment and document list filters work again.
