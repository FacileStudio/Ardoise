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

### Added

- Suite billing backoffice at `/admin/offres` (Offres in the sidebar): features, versioned plans with monthly and yearly prices, a publish dialog with the diff and the subscribers it affects, subscriber migration, overrides, comped people and the subscriptions list. Published versions are immutable; editing means a new draft.
- **Security:** the backoffice and every `billing.*` procedure are restricted to `BILLING_STAFF_EMAILS` (verified email, active ADMIN). Every SSO sign-in is ADMIN, so the role alone is not enough. Empty means nobody. Every billing mutation writes an audit row with before and after.
- Publishing a version mirrors it to Stripe: product `plan_<key>`, prices with lookup keys `plan_<key>_month|year` (`transfer_lookup_key`), previous prices archived, idempotency keys on every write.
- Registre billing API: public `GET /api/catalog` (published versions only, cached 60 s) and, behind `BILLING_API_TOKEN` (32+ characters, constant-time SHA-256 compare, rate limited), `GET /billing/spaces/:spaceId`, `POST /billing/checkout` (one Stripe customer per space, price only from a published lookup key, owner checked against the Registre snapshot) and `POST /billing/portal`. Redirects must match `BILLING_REDIRECT_ORIGINS`.
- Entitlements resolution (override, owner comp, subscription plan with a 7-day past_due grace, defaults) pushed to Registre `PUT /api/directory/entitlements` with a monotonic revision on publish, webhook, override or comp change, directory change, at boot and every 10 minutes. Failures land in `EntitlementPushState.lastError` and never stop the server.
- Stripe subscription webhooks (`customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`) tagged with `registre_space_id` update `SpaceSubscription`, deduplicated through `BillingEvent` and cross-checked against the space's Stripe customer. A nightly reconcile repairs the rows. Client invoice payments keep their flow.
- `mise run billing:seed` (or `BILLING_SEED_ON_BOOT=true`) seeds six features, Solo, Pro and Studio as drafts and comps the four Facile Studio owners on Studio, so they get Glouton access before anything is published.
- Migration `20261104120000_add_billing`.

## [0.12.1] - 2026-11-04

### Fixed

- Settings, Avancé tab links to the spaces pages again; v0.12.0 had removed their only entry point with the switcher.

## [0.12.0] - 2026-11-03

### Changed

- **Breaking:** the admin shows every space you belong to at once. Clients, missions, documents and payments list everything you can reach, with a Space column and a space filter that defaults to "Tous les espaces". The space switcher is gone. A space's page has a "Voir ses données" button that applies the filter.
- **Breaking:** a list call without `spaceId` now covers every space of the caller instead of the personal scope. A caller in no space gets nothing.
- **Breaking:** providers are shared by every space. `provider.*` takes no `spaceId`. Migration `20261103200000_global_view` merges providers that share an email: the row with the most references is kept, its empty fields are filled from the copies, and documents, mission links and prestations move to it.
- Only a new client picks a space (`client.create` requires `spaceId`). Missions, documents and payments take the space of their client.
- Glouton writes answer 422 `space_required` when `registreSpaceId` is null.

### Removed

- **Breaking:** the personal scope. `spaceId` is required on clients, missions, documents and payments, and the migration stops if any row has none. A space holding data cannot be deleted.

## [0.11.1] - 2026-11-03

### Fixed

- Staff avatars: the Facile SSO picture now wins over a stale uploaded avatar, whose private storage URL answered 401 and left only initials.

## [0.11.0] - 2026-11-03

### Removed

- Staff password login: `auth.login`, `user.changePassword` and the password form are gone. Staff sign in with Facile SSO only.
- The bootstrap admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_MIGRATE_FROM`, `SSO_ONLY` and the `create-admin` script.
- The users admin: the Users settings tab, `/admin/users`, staff invitations (`invitation.*`, `/invite`) and `user.create`, `list`, `getById`, `update`, `adminUpdate`, `delete`.
- The Spaces link in the admin sidebar; the space switcher's "manage spaces" still opens `/admin/spaces`.

### Changed

- `OIDC_ISSUER` is required in production.
- Staff profiles (name, picture) come from the SSO profile only; `user.updateProfile` refuses staff.
- `GET /auth/config` no longer returns `sso_only` or `password_login`.

## [0.10.0] - 2026-11-03

### Added

- Optional two-way client sync with Glouton (`GLOUTON_URL`, `GLOUTON_API_TOKEN`,
  `GLOUTON_WEBHOOK_SECRET`). Ardoise sends signed client and mission events to Glouton and
  accepts client writes on `/api/integrations/glouton/clients`, last write wins on `updatedAt`.
  Linked clients show a Glouton badge. Migration `20261103180000` adds `Client.gloutonCompanyId`.

## [0.9.1] - 2026-11-03

### Changed

- Spaces use the share-circle icon.

## [0.9.0] - 2026-11-03

### Changed

- Facile SSO owns staff: anyone who signs in through SSO is staff, a first sign-in creates the account, and every sign-in refreshes the name and picture from SSO.
- Under SSO_ONLY, Ardoise no longer creates staff, changes roles or sets passwords, and the users settings hide invitations, promote and demote.
- The SSO picture is the stable Registre URL instead of a one-time copy, so a new picture shows without signing in again.

### Fixed

- Staff showed as "Admin User": Registre sends `name` but no given or family name, and only those were read.

## [0.8.0] - 2026-11-03

### Added

- Spaces mirror Registre's shared spaces: imported once, then synced at boot, every 5 minutes and on `POST /api/registre/sync`.
- Registre members Ardoise does not know yet are provisioned as SSO-only admins; an existing user's role never changes.

### Changed

- Linked spaces are managed in Registre: create, rename, delete, membership and leave answer 409, and the web shows a Manage in Registre link.

## [0.7.6] - 2026-11-01

### Changed

- `@facile/muse` bumped to v0.7.2: the Select chevron sits 12px inside the border.

## [0.7.5] - 2026-11-01

### Fixed

- The admin space switcher changed the selected space but not the data on screen: every page
  fetched once on mount. The admin layout now remounts the page when the space changes, sends
  detail pages back to their list, and drops a stored space you no longer belong to.

## [0.7.4] - 2026-11-01

### Fixed

- Reloading any admin page after an SSO login signed you out. `auth.me` returned only the token
  payload (`id`, `email`, `role`); the login page stored it, and on reload the client store rejected
  it for lacking `firstName` and `lastName` and redirected to `/login`. `auth.me` now returns the full
  user from the database, and the root layout seeds the store from the server-verified user instead
  of trusting `localStorage`.

## [0.7.3] - 2026-11-01

### Fixed

- Reloading an admin page still signed you out after 15 minutes. The refresh succeeded, but the web
  server and the browser client looked for the user under `result.data.json`, a wrapper this API
  does not send, so they saw no user and redirected to `/login`. Both now read `result.data.user`.

## [0.7.2] - 2026-11-01

### Fixed

- Reloading could still sign you out when the browser held an old `refresh_token` or `auth_token`
  cookie next to the new one (same name, different Domain or Path). The old one came first, failed,
  and the client logged out. The API now tries every cookie of that name, and each login expires the
  host-only and legacy-path leftovers.

## [0.7.1] - 2026-11-01

### Fixed

- Reloading an admin page after 15 minutes signed you out. The refresh cookie was scoped to
  `/trpc/auth.refresh`, so the web server never received it and the admin guard redirected to
  `/login`. The cookie now covers the whole site and the guard refreshes the session server-side.
  Sessions started before this release sign in once more.
- The Settings > Entreprise section crashed on an unset share capital (`props_invalid_value`).
  Settings sections now sit behind an error boundary, validate numbers before saving, and show a
  retry instead of an empty form when loading fails, so a failed load can no longer be saved over
  the real settings.
- Renaming a generated document deleted its stored PDF, and saving an imported document flattened
  its detailed lines into one. Only changed fields are sent and a rename keeps the PDF.
- A provider with a 0% VAT rate was priced at 20% on the client dashboard and in imports.
  Non-integer VAT rates are now refused instead of rounded.
- A document or payment could be linked to another client's mission. It is now refused.
- Plume sign links are only accepted as http(s) URLs.
- Reopening a paid manual payment could resurrect a cancelled one, and a payment counted as
  overdue before its due day ended.
- Editing an imported invoice's total now updates its manual payment, and a failed import no longer
  loses the uploaded file.
- Manual signature status clears the stored client sign link.

## [0.7.0] - 2026-11-01

### Added

- Client dashboard at `/app`: an action strip (invoices to pay, documents to sign), billed, paid,
  remaining and overdue totals, one card per project with its price and paid progress, a filterable
  list of quotes, invoices and contracts with download, and the payment history.
- A Sign button on contracts waiting for a signature. It opens the client's own Plume link, which
  Ardoise now stores per document (`plumeClientSignUrl`) and fetches from Plume when missing.
- Import of existing documents: upload a PDF made outside Ardoise, with client, project, type,
  number, issue date, total and signature status. A paid invoice creates a manual paid payment.
  Imported documents keep their real date (`issuedAt`) and show an Imported badge.
- Admin edit pages for documents, with PDF replacement and manual signature status, and manual
  payments that can be created, edited, marked paid or unpaid, and deleted.
- Delete on client and provider detail pages. A delete blocked by linked records now says which
  records block it.

### Changed

- Deleting a mission, client, provider or document that is still referenced answers
  `PRECONDITION_FAILED` with counts, instead of `BAD_REQUEST` or `CONFLICT`.
- Editing a generated document clears its stored PDF so the next download regenerates it.

## [0.6.1] - 2026-11-01

### Fixed

- Reloading a page signed you out once the 15-minute access cookie had expired. The `/admin` guard
  sent you to `/login`, where the session check never tried the refresh token. It now refreshes
  once before giving up, and `/login?next=` returns you to the page you reloaded.

## [0.6.0] - 2026-11-01

### Changed

- **Breaking:** clients no longer have a password. They sign in on `/login` with an emailed
  one-time link (15 minutes, single use), built on `@facile/magiclink`. `User.password` is nullable
  and the migration `20261101120000_add_magic_links` sets it to `NULL` for every CLIENT, without
  notice. Admins keep password and SSO sign-in.
- `auth.login` refuses every CLIENT with `Invalid credentials` and the same hashing work as a wrong
  password. `user.create`, `user.adminUpdate` and `user.changePassword` refuse passwords for clients.
- `invitation.create` and `invitation.accept` refuse CLIENT invitations, space invitations
  included. Create the client first, then add it to the space.
- `client.create` takes no `credentialPassword`. With `createCredentials`, the new client gets a
  welcome mail with a sign-in link that skips the public rate limit.
- `space.inviteMember` is removed. Adding an unknown email to a space now says to create the client
  first. The admin invitation page only invites administrators.
- The login page shows a client form (email, "send me a link") and a team sign-in view.

### Added

- `magicLink.request` and `magicLink.consume`, the `MagicLink` table, the `/login/verify` page
  (confirm button, POST consume, `Referrer-Policy: no-referrer`, token removed from the address
  bar) and the `sendMagicLink` mail template.
- `MAGIC_LINK_TTL_MINUTES` (15), `MAGIC_LINK_MAX_PER_EMAIL_HOUR` (5) and
  `MAGIC_LINK_MAX_PER_IP_HOUR` (20).
- The web server redacts `token`, `ticket`, `code` and `state` in the URLs it logs, so a
  `/login/verify` link never reaches the logs.
- `client_magic_link` in `GET /auth/config`. Both magic link procedures share the strict
  rate-limit bucket with `auth.login`.

## [0.5.2] - 2026-10-31

### Changed

- `zod` 3.25 to 4.6.7 in every workspace, with the Prisma zod schemas regenerated. This closes the
  six remaining `zod` Dependabot alerts (memory exhaustion on oversized arrays and sets, patched
  only from 4.6.6). `z.record` takes its key schema and `ZodError.issues` replaces `.errors`.

## [0.5.1] - 2026-10-31

### Fixed

- The rate limiter and the session metadata took the first `X-Forwarded-For` entry, which the
  caller controls, so anyone could pick a fresh identity per request. Both now use the entry
  Traefik appended, and fall back to the connection address when the header is absent.
- Dependabot: `nodemailer` 6 to 10.3.1 closes its 23 alerts. The nested `zod` 4.3.6 copies pulled
  in by `@scalar/types`, `sveltekit-superforms`, `trpc-redis-cache`, `trpc-to-openapi` and
  `zod-prisma-types` move to 4.6.7 in `bun.lock`. Eight alerts stay open: six on the workspaces'
  own `zod` 3.25, which only a move to zod 4 fixes, and two low, development-only ones on
  `@sveltejs/kit`, which need SvelteKit 3.

## [0.5.0] - 2026-10-31

### Added

- `document.sendForSignature` sends the client with the request. Plume files the document under
  its client with the same email and creates that client when missing. Needs Plume 0.5.0.

## [0.4.0] - 2026-10-31

### Removed

- DocuSeal support: the `@repo/docuseal` package, the `docuseal` tRPC router, the `/admin/sign`
  pages and their nav entry, and the DocuSeal block in Settings. Plume is the only signature
  provider. A migration drops `Settings.docusealApiUrl` and `Settings.docusealApiKey`, so a stored
  DocuSeal key is deleted.

## [0.3.0] - 2026-10-31

### Changed

- **The whole web app is rebuilt on `@facile/muse`, with no borders.** Cards, tables, stat tiles and
  alerts are fills on the page background, as in the other Facile apps. Every page opens with
  `Page` and `PageHeader`, lists use `Table` with `Card` rows on mobile, filters use `Tabs`, forms
  use `Field`, empty states use `EmptyState`, and every destructive action goes through a
  `ConfirmModal` that says what it breaks.
- **The admin and client shells use muse `SideBar` and `MobileNav`.** The sidebar collapses, has the
  space switcher and a user card that opens Settings. The client area now has a mobile nav too.
  Admin nav order is Statistiques, Missions, Documents, Signatures, Paiements, Clients,
  Prestataires, Espaces, and `/admin` opens Missions.
- **Settings moved to `/admin/settings/[[section]]` and `/app/settings/[[section]]`.** Staff get
  profile, appearance, company, billing, payments, email, integrations, users and advanced tabs;
  clients get profile and appearance. Secrets use `SecretField`, connection state uses
  `StatusDot`, and logout is a row in Profile. Staff are not offered a password change when the
  backend runs in SSO-only mode. `/admin/users` opens the users tab. `/admin/profile` and
  `/app/profile` are gone.
- The PDF preview is a muse `Modal` and the document preview a muse `Drawer`. The Documents page
  links to Signatures, and each contract shows its signature status.
- Icons are bundled (`src/lib/icons/*.json`, regenerate with `bun run icons`) and the iconify CDN
  script is gone, so the first paint has icons without network.
- `apps/web` compiles with `strict: true`, so its tRPC types match the backend, and `typecheck`
  and `lint` cover it in CI and in the release workflow.
- Removed `UserCard`, `UserMenu`, `Toggle`, `LanguageSwitcher`, `AutoForm`, `AutoTable` and the
  unreachable `/admin/[entity]` route.

### Fixed

- **A rate-limited or failing session check no longer bounces between `/login` and `/admin`.** The
  guard now redirects to `/login` only on a definite 401 and shows a 503 page for other failures.
- The client and provider pickers called a missing `admin.providers` endpoint and an unsupported
  `offset` input, so they could not load. They use `provider.list` and `client.list`.
- Creating a maintenance contract navigated to `/admin/documents/undefined`. It now opens the
  documents list.
- Invoice and quote previews no longer send `invoice_number` and `quote_number`, which the
  procedures ignore.
- The user edit page offered the role `USER`, which the backend rejects. It offers `CLIENT`.

## [0.2.3] - 2026-10-31

### Security

- `user.me`, the user lists, the admin entity engine, and the payment and client mutations no longer return password hashes. The user detail no longer returns refresh tokens or provider tokens, and hashes stay out of the audit trail.
- Changing or resetting a password revokes the other sessions of that user.
- Avatar and cover updates only accept keys under the caller's own upload folder, upload names are sanitized, and the storage layer refuses keys that leave its root. A replace no longer deletes the file it points back to.
- tRPC batches are rate limited per procedure and per bucket. One batched request used to carry any number of login attempts.
- Invitation `revoke` and `resend` require admin rights in the invitation's space.
- `settings.get` (public) returns an allow list. Numbering counters, number formats and fee defaults are no longer exposed.
- Refresh token rotation is atomic, so two concurrent refreshes with one cookie no longer both succeed.
- Request logs redact `ticket`, `code`, `state` and `token` query parameters. Health checks no longer return raw driver errors.
- The OIDC avatar fetch rejects IPv4-mapped IPv6 and carrier-grade NAT addresses. The webhook, DocuSeal and OIDC calls time out.

### Fixed

- Session checks (`auth.me`, `auth.refresh`, `auth.logout`) no longer share the five-a-minute login
  rate limit bucket, which normal page navigation could exhaust and turn into a forced logout.
  Only `auth.login` keeps it.
- A Stripe webhook whose processing failed was recorded as handled, so Stripe's redelivery was ignored and the payment stayed pending. The event id is released when processing throws.
- The payment receipt is marked as sent only after the confirmation email goes out, so a failed send is retried.
- Concurrent requests could issue the same invoice, quote or contract number. The counter is read and incremented in one statement, and a number is taken only after the client and provider checks pass.
- User text such as `{{items}}` in a document was expanded into Typst code by a second substitution pass. Templates are substituted once and compiled directly.
- The admin entity form offered the role `USER`, which the database rejects. It now offers `CLIENT`. The media entity validated with the user schema.
- `/health` walked the whole storage tree on every probe. It now checks that the storage root is reachable.

### Changed

- Removed the unused `payment.handleWebhook` tRPC procedure. Stripe posts to `/webhook`.
- Removed unused dependencies (`bcrypt`, `bcryptjs`, `jsonwebtoken`, `crypto-es`, `@faker-js/faker`, `@logtail/pino`, `@react-native/eslint-config`), dead modules and unused storage methods. The backend now declares `jose` and `zod`.
- DocuSeal settings load only for DocuSeal procedures instead of on every request.
- The general rate limit is 300 procedure calls per minute per client, counted per procedure instead of per path.

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
