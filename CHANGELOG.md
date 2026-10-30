# Changelog

All notable changes to this project are documented here. The format is
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While on
`0.x`, a breaking change bumps the minor.

Releases are tagged `v*` on `main`. A tag does not deploy anything. Production
runs the Compose stack on Dokploy (`docker-compose.yml`, one backend and one web
container behind Traefik), and `apps/backend/railway.toml` describes a Railway
build of the backend from its Dockerfile. Both deploy from the repository, not
from the tag. A tag publishes the backend image to
`ghcr.io/facilestudio/ardoise` and creates the GitHub release.

## [Unreleased]

## [0.1.0] - 2026-10-30

First versioned release. It records what exists on `main`; earlier work was not
tagged.

### Added

- Payment requests: an admin creates a payment for a client, the client is emailed a link and
  pays through Stripe Elements. Stripe webhooks are idempotent, with handling for failed and
  past-due recurring payments, invoice history, billing portal and receipt retry.
- Documents: seven service-specific document types with automatic numbering, rendered to PDF
  with Typst, attachable to a payment. Receipts and templates use the Typst pipeline.
- Providers with logos (stored in S3-compatible storage or on the filesystem), clients with
  optional address fields, and client access decoupled from client records.
- Spaces: rows belong to a space, with roles and member management, scoped so that a write
  without a space cannot be expressed.
- Authentication: cookie-based sessions, OIDC/SSO sign-in with background profile and avatar
  sync, an `SSO_ONLY` mode, and per-route rate limiting.
- Admin panel and client portal in one SvelteKit app, with English and French translations.
- Settings stored in the database, with secrets encrypted at rest.
- Payment reminders and email notifications over SMTP, plus webhook event notifications.
- API reference at `/docs` and the OpenAPI document at `/docs/openapi.json`.
- Health endpoints `/health`, `/health/live` and `/health/ready`.
- `GET /version` returns the release tag or commit the image was built from, or `dev`.
- Docker images for the backend and the web app, a Compose stack with Postgres, and a Railway
  config for the backend.
- GitHub workflows: `filet` code-quality check, CI (typecheck and lint), and a tag-driven
  release that publishes the image and the GitHub release.
- `CHANGELOG.md` and a root `package.json` version as the version source of truth.

### Changed

- The project was renamed from Charles to Ardoise, and the separate client and backoffice apps
  were merged into one web app.
- Storage moved from MinIO to a local filesystem object store with ticket-signed uploads.
- Prisma migrations run before the backend starts, through the Dockerfile command and the
  Railway pre-deploy hook.
- The UI follows the suite design system, with harmonized auth screens, favicons and metadata.

### Fixed

- Internal errors are sanitized in production, the storage upload requires a ticket, and the
  admin guard runs on the server.
- CORS preflight handling, storage permissions in the container, and the Typst binary path in
  the backend image.
- The web build no longer loads `pino-pretty` unless `LOG_PRETTY` is set.
