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

- `@facile/muse` v0.14.4 to v0.16.1. Buttons use the `secondary` and `ghost-danger` variants in place of the deprecated `outline` and `danger`.
- `GET /version` returns the version of the root `package.json`, which the backend image now carries, so it matches the release without any deploy environment change. The `VERSION` build argument and the `APP_VERSION` and `RAILWAY_GIT_COMMIT_SHA` plumbing are gone.

## [0.19.4] - 2026-11-07
### Fixed

- `numbering.test.ts` took the test-database advisory lock in three sibling `describe` blocks. Bun 1.2.0, the version `mise.toml` pinned, runs the `beforeAll` hooks of sibling blocks before the first block's `afterAll`, so the second lock waited for the first and the file hung. The file now takes the lock once. No application code changed: production invoice and quote numbering was not affected.

### Changed

- `mise.toml`, `mise.lock` and `packageManager` pin Bun 1.3.7, the version CI and both Dockerfiles already use. Bun 1.2.0 also fails 12 webhook and client-IP tests.
- CI gains a `tests` job: Postgres 16 service, `prisma migrate deploy`, then `bun test` in `packages/trpc`, `apps/backend` and the other test packages. The database-backed tests never ran in CI before.

## [0.19.3] - 2026-11-07

### Changed

- `StripeService.createCheckoutSession` no longer passes `payment_method_types: ['card']`. Every Checkout Ardoise opens (client invoice payments, maintenance subscriptions and Facile plan subscriptions) now takes its payment methods from the Stripe account's payment method configuration, so SEPA Direct Debit appears once it is active there. The asynchronous SEPA events (`checkout.session.async_payment_succeeded` and `async_payment_failed`) are already handled by the payment webhook.
- Stripe customers created for client maintenance subscriptions carry an invoice footer built from the payment's space: the lead provider of the payment's mission (else the space's oldest provider) with its SIRET, then the space's VAT exemption mention when `vatExempt` is on, or the provider's VAT number otherwise. A space with no provider gets no footer. The footer is part of the customer idempotency key. Customers that already exist are not updated.
- `@facile/muse` v0.14.2 to v0.14.4: the user menu offers French and English only (`locales`), the language switch re-renders live, the Subscription row no longer needs a `plan`, and a single-slice `DonutChart` draws a clean ring.

## [0.19.2] - 2026-11-07

### Fixed

- Publishing a plan version reuses the previous version's Stripe price for every price whose amount, currency and interval did not change, moving the unique `stripePriceId` to the new row in the publish transaction. Only changed prices create a new Stripe price and archive the old one, so subscribers stay on their price ids.

## [0.19.1] - 2026-11-07

### Changed

- `@facile/muse` v0.14.1 to v0.14.2: the user menu clamps itself inside the viewport at the right edge of a header.
- The language picked in the user menu or in Preferences is kept across reloads (`fc_locale` cookie). French stays the default when nothing was chosen. The app no longer forces French on every load.
- The admin user menu has a Subscription row that opens `https://sso.facile.studio/spaces`.

## [0.19.0] - 2026-11-07
### Changed

- The admin sidebar and the client portal (`/app`) show muse's user card and open its user menu: account, settings, theme, help and sign out. The theme choice is stored in `localStorage` (`ardoise.theme`) and applied before the page paints. The language row is hidden because the interface is French
- Settings use muse's `SettingsLayout`. Admin settings: Profile, Preferences, Company, Billing, Payments, Email, Integrations and Advanced at `/admin/settings/<section>`. Client settings: Profile and Preferences. `/…/settings/appearance` redirects to `preferences`
- The space settings page is split into General, Numbering, Legal mentions (payment terms, VAT regime), Outgoing webhook, Platform studio and Advanced at `/admin/spaces/<id>/settings/<section>`. The fields, validation and saves are unchanged
- The admin profile is read-only (identity lives in Registre); the in-settings sign-out and the Appearance tab are gone. Clients keep editing their first and last name, since they have no Facile account
- muse v0.7.4 to v0.14.1; the landing, login and offers pages lose their decorative borders

## [0.18.0] - 2026-11-07

### Added

- A Revenus page (`/admin/revenus`), for space admins and owners only, with what is collected (this month, this year, the last 12 months), what is still to collect (overdue payments and invoices, upcoming payments, and a separate figure for invoices more than 12 months late) and a 12-month forecast by source: open payments by due date, recurring maintenance by card or transfer, accepted quotes not yet invoiced (remainder only, dated by the quote date or "not dated") and invoices without a payment request. No probability is applied. Amounts are summed in Postgres in Europe/Paris through the new `revenue.overview` procedure. French and English strings. Amounts carry a "TTC" note, left out when every space in scope is VAT exempt (`SpaceSettings.vatExempt`).

## [0.17.0] - 2026-11-07

### Changed

- Contract PDFs are archived in the creating user's private Ardoise folder in Nuage (app folders)
  instead of a Nuage space. Ardoise exchanges the user's stored Registre session for a 5-minute
  `nuage.write` token and calls `PUT /api/app/object`.
- Facile SSO sign-in asks for `offline_access` and keeps the Registre access and refresh tokens,
  sealed with `ENCRYPTION_SECRET`, on the user's `Account` row. Users get a refresh token at
  their next sign-in; until then their contracts are not archived.
- `NUAGE_AUDIENCE` (Nuage's Registre client id) replaces `NUAGE_API_TOKEN`,
  `NUAGE_SPACE_FACILE_ID` and `NUAGE_SPACE_NAME`. `NUAGE_URL` now also needs `OIDC_ISSUER`.
- Documents sent to Plume no longer carry `nuage_space_facile_id`. Plume stores the signed copy in
  its own private folder; `nuage_linked_to` still tells Ardoise when it is archived.

### Removed

- The find-or-create Nuage space provisioning.

## [0.16.0] - 2026-11-07

> **Before deploying:** apply migration `20261107120000_client_payments`. In the Stripe Dashboard, add `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded` and `charge.dispute.created` to the existing webhook endpoint, and enable card and SEPA Direct Debit under Settings, Payment methods.

### Added

- Clients pay from the dashboard: open invoice payments and maintenance subscriptions are listed at `/app`, paid on Stripe-hosted Checkout by card or SEPA Direct Debit, and the maintenance payment method can be changed or cancelled in the Stripe Customer Portal (`portal.payments`, `portal.checkout`, `portal.manageMaintenance`).
- Pay link: the payment email and reminders carry `/pay/<token>`, a public page that shows only the amount, reference and issuer and starts Checkout. The token has 256 bits, is stored as a sha256 hash, expires after 90 days and can be revoked from the admin payment page. Own rate-limit bucket.
- "I paid another way": the client declares a transfer, cheque or other payment (optional reference and date) from the dashboard or the pay page. The payment becomes `AWAITING_CONFIRMATION`, the space members get an email, and an admin confirms (`PAID`, `MANUAL`) or rejects it. Declare, confirm and reject are audit-logged. The bank details come from the existing `Settings` IBAN and BIC.
- Payment statuses `PROCESSING` (SEPA debit not cleared) and `AWAITING_CONFIRMATION`.
- Migration `20261107120000_client_payments`: the two statuses, the declaration columns, `Payment.stripeCheckoutSessionId`, the `PaymentLink` table, and `Payment.declaredPriorStatus`, `needsAttention` and `attentionAt`, a nullable `AuditLog.userId` so a pay-link action can be logged without a user.

### Changed

- At most one Checkout Session per payment is live. The stored session is reused when it is still open with the same amount, currency, mode and return URL, and expired otherwise; a completed one blocks a new session until the webhook settles it. The idempotency key no longer contains the return URLs (and so no pay token): it is the payment id, amount and previous session id. Changing the amount of a Stripe payment expires its open session.
- A failed bank debit can be retried: the failed session and intent ids are cleared when `async_payment_failed` arrives, and a completed session blocks a new checkout only while its money is paid or still clearing (checked on the PaymentIntent or subscription).
- A legacy PaymentIntent or subscription is retrieved first. Terminal or unpaid ones are cancelled and cleared; succeeded, processing or active ones, and anything Stripe cannot confirm, keep their ids for the webhook and refuse the new checkout.
- Two first checkouts that clash on the idempotency key return the session the first one stored instead of an error. An unhandled `needsAttention` flag keeps its first reason.
- `scripts/send-open-payment-links.ts` skips payments reminded within `SINCE_DAYS` (7), so a rerun mails nobody twice.
- Money that no rule can settle is stored on the payment (`needsAttention`: `DUPLICATE_PAYMENT`, `DUPLICATE_SUBSCRIPTION`, `AMOUNT_MISMATCH`, `REFUNDED`, `DISPUTED`), shown on the admin payment page until dismissed, and emailed to the space members. A second subscription for one payment is cancelled at once. `charge.refunded` and `charge.dispute.created` flag the payment.
- A rejected declaration restores the status the payment had before it was declared. Pay links are revoked when the payment is paid or cancelled.
- The client IP walks `X-Forwarded-For` right to left, skipping private and Cloudflare ranges (ported from tronc), and reads `CF-Connecting-IP` only when the last hop is a Cloudflare edge. Visitors behind one edge no longer share a rate-limit bucket, and the audit IP is the visitor.
- `scripts/send-open-payment-links.ts` issues pay links and sends a reminder for every open Stripe payment, overdue ones included. Report only until `APPLY=1`.
- **Ardoise no longer adds Stripe fees to the client total.** Card and SEPA surcharges are banned for consumers by PSD2 (directive 2015/2366 art. 62) and French Code monétaire et financier L112-12. New payments charge exactly the invoice amount (`stripeFee = 0`, `totalWithFees = amount`).
- The webhook sets `PAID` only after checking the event's amount, currency, mode and space against the payment row, and follows asynchronous SEPA results. A mismatch is logged and never marks the payment paid.
- Stripe objects are created when the client pays (Checkout Session with an idempotency key), not when the admin creates the payment. A still-unpaid legacy PaymentIntent or subscription is cancelled when the client pays again.
- Return URLs and links are built from `FRONTEND_URL`, not from the request `Origin`.
- The web app no longer loads Stripe.js (`@stripe/stripe-js` removed); `/pay/*` is served `no-store`, `noindex` and with `Referrer-Policy: no-referrer`, and its token is redacted from logs.

### Removed

- `payment.getByIdPublic`, `payment.getClientSecret` and `payment.billingPortal`: the first two let anyone holding a payment id read it or get its client secret. `/app/payment/:id` redirects to the dashboard.

## [0.15.0] - 2026-11-07

> **Migration:** `20261106150000_space_settings` creates `SpaceSettings` and `DocumentCounter`. Every existing space gets a `SpaceSettings` row copied from the global `Settings` (number formats and payment defaults). Each space that already holds numbered documents gets its invoice and quote counters seeded from the global `Settings.nextInvoiceNumber` and `nextQuoteNumber`, which were above every number ever issued, so no number is reused whatever the old format looked like. Spaces without documents start at 1. The migration also adds partial unique indexes on `(spaceId, invoiceNumber)` and `(spaceId, quoteNumber)`; if a space already holds duplicates it prints a notice and skips that index instead of failing.

### Added

- Document numbering per space and per type (invoice, quote). The next number is allocated in the same transaction as the document insert, with a counter row locked until commit, so concurrent requests never share a number and a failed insert leaves no gap.
- Outbound webhook per space. A space owner or admin sets a URL, a secret and an event filter in the space settings. The secret is encrypted at rest and never returned (`webhookSecretSet` only). Deliveries use the platform signer (`x-ardoise-signature-256`).
- Payment and legal defaults per space (payment terms, late-penalty text, recovery fee, VAT mention, extra legal mentions printed in the footer), with the French defaults. `space.getSettings` and `space.updateSettings`, space admins only for writes and for the webhook.
- Space settings page: numbering, payment and legal, webhook, and for platform staff only the platform studio switch (`space.setPlatformStudio`).

### Security

- The space webhook refuses http, credentials in the URL and any host that resolves to a private, loopback, link-local, reserved or mapped address, checked when saved and again before each delivery. The connection goes to the address that was checked, TLS is verified against the host name, the timeout is 5 s and a redirect counts as a failure.
- A sign-in sets `emailVerified` only when the `email_verified` claim is literally true. A member provisioned from a Registre snapshot without that flag stays unverified and is never linked to a local account by email.
- Documents take the payment and legal defaults of the space of their client, not the global settings. The new procedures are in the access map and are called as a member of another space by `access.db.test.ts`.

### Fixed

- A counter that fell behind an existing number no longer locks a space out. When the insert hits a number already used in the space, the counter moves past the highest number matching the space's format and the document is issued again, at most 20 attempts. Migration `20261107110000_counter_parse` also raises every counter to one above the highest `PREFIX-YYYY-NNN` number of its space.
- `document.delete` and `mission.delete` keep their number guards for generated documents only. Imported documents stay deletable and correctable.
- VAT regime per space. `SpaceSettings.vatExempt` (franchise en base de TVA, set by migration on every platform studio space, off elsewhere) makes devis, factures, appels de fonds, maintenance and prestation documents print no TVA line, a plain "TOTAL" instead of "TOTAL TTC", no "HT" on the columns, and the mention "TVA non applicable, art. 293 B du CGI" (or the space's own mention). Line amounts and stored totals carry no VAT (rate 0). Other spaces are unchanged. Space admins set it in the space settings page. Before, every document printed a VAT line and TOTAL TTC whatever the regime. The same applies to the contract back-office document (no more hardcoded 293 B line for a registered space), the deposit sentence of the devis and the payment receipt, which now follows the regime and mention of the payment's space.
- The platform webhook signed with the stored, encrypted `Settings.webhookSecret`, so no receiver could verify `x-ardoise-signature-256`. It now signs with the decrypted secret, like the per-space webhook. If you copied the stored ciphertext from the database into a receiver as its key, replace it with the secret you entered in the settings.
- `document.delete` refuses a document that carries an issued invoice or quote number (`PRECONDITION_FAILED`, asks for a credit note), so deleting one can no longer leave a gap in the numbering. Documents without a number stay deletable.
- Two concurrent `mission.generateInvoice` calls on one mission can no longer both pass the pre-checks: the invoice transaction locks the mission row and re-checks the billing state, so exactly one invoice is created and the other call is refused.

### Changed

- `mission.delete` refuses a mission that holds a numbered quote (`PRECONDITION_FAILED`), like invoices and payments, so it cannot leave a gap in the quote numbers.
- A number format must end with `{{number}}`, used once.
- Webhook events are no longer awaited by the request that raises them: delivery starts in the background and failures are only logged. The DNS lookup of a space webhook times out after 3 s.
- A PDF stored for a document whose insert fails is deleted again.
- The platform webhook only hears platform studio spaces (and platform events); every other space has only its own webhook. This is not new in this release, it is now stated here.
- The global `Settings.next*Number` counters and number formats are no longer read.

## [0.14.3] - 2026-11-06

### Changed

- Subscription checkout asks for a billing address (`billing_address_collection: required`). Stripe customers Ardoise creates carry the invoice footer "Yann THEVENIN EI · SIRET 924 415 714 00022 · TVA non applicable, art. 293 B du CGI", which Stripe prints on every subscription invoice and renewal. Customers created before this change keep the account default footer, so set it in the Stripe dashboard (Settings, Billing, Invoice template).

## [0.14.2] - 2026-11-06

### Fixed

- The Stripe webhook answers 400 `Invalid signature` when signature verification fails, instead of 200. A wrong or rotated webhook secret no longer makes Ardoise acknowledge and drop real events, so Stripe retries and flags the endpoint. It answers 503 when Stripe is not configured.

## [0.14.1] - 2026-11-06

### Changed

> **Deploy order:** `/billing/portal` now requires `owner_email`, so Registre must already run v0.5.1 or later (it does in production).

- **Breaking for Registre:** `POST /billing/portal` requires `owner_email`, checked against the space's owners in the Registre snapshot like checkout.
- Comps grant the published version of their plan, and only fall back to the latest version when the plan was never published. A draft no longer leaks to comped people.
- Spaces without a subscription get the published version of the plan flagged free (`Plan.isFree`, set on Solo by migration `20261106120000_billing_review`), not the first plan by sort order. Staff toggle it in the plan settings.

### Added

- `GET /api/catalog` is readable cross-origin by the suite's static pages: `Access-Control-Allow-Origin: *` without credentials, GET only, preflight answered, `Cache-Control: public, max-age=60`. The rest of the billing API (`/billing/*`) no longer gets the app's credentialed CORS.

### Fixed

- Checkout no longer opens a second database connection when it syncs a completed session, so concurrent checkouts cannot exhaust the pool and hang.
- At most one free plan, enforced by a partial unique index (migration `20261106130000_free_plan_unique`); a concurrent save answers CONFLICT, and unflagging the only free plan is refused. The free plan grants its published version only (feature defaults when none is published), and the choice is ordered by sort order then key.
- `GET /api/catalog` errors are `no-store` instead of publicly cacheable, its preflight no longer echoes `Access-Control-Request-Headers`, and a bare `/billing` gets no credentialed CORS.
- Checkout refused a second session only while the first was open. It now also syncs a completed session and refuses while its subscription has not ended, so a slow webhook cannot let a space pay twice.
- A second live subscription of one space no longer overwrites the first. Subscription syncs run under a per-space advisory lock; the second is kept in `DuplicateSubscription`, logged as an alert and shown to staff in `/admin/offres`, and promoted once the first ends.
- Publishing archives the previous version's Stripe prices only after the database commit; an archive failure is logged and reported instead of failing the publish. A concurrent publish of the same draft answers CONFLICT.
- Subscriber migration and customer creation idempotency keys now include the mode, target price and customer details.
- A wrong-token IP lockout on `/billing/*` no longer blocks the valid token.
- Deleting a draft gives its Stripe prices' lookup keys back to the published version and archives them. Two drafts created at once answer CONFLICT instead of a 500. The seed runs under an advisory lock, so concurrent boots cannot race.
- DB test files take one shared advisory lock (`@repo/database/test-lock`), so two test runs against one database no longer wipe each other's rows (the P2025 and timeout flakes), and the magic-link test no longer disconnects the shared Prisma client.

## [0.14.0] - 2026-11-06

> **Before deploying:** set `PLATFORM_STAFF_SUBS` in the Dokploy compose env (or keep `BILLING_STAFF_SUBS`). Without it nobody can reach the platform settings.
>
> **Before rolling back to v0.13.0:** run `UPDATE "User" SET role = 'ADMIN' WHERE role = 'MEMBER';` first. v0.13.0's Prisma client cannot read `MEMBER` rows, so sign-in fails without it.

### Upgrade note

- **Set `PLATFORM_STAFF_SUBS` before deploying.** It lists the Registre subjects of the platform staff (today the four Facile owners; `BILLING_STAFF_SUBS` is read as a deprecated alias, so an existing value keeps working). With it unset, nobody can open the platform settings (Stripe, SMTP), the admin engine, audit logs or `/admin/offres`. Add it to the Dokploy compose env; `docker-compose.yml` forwards it.
- Migrations `20261105120000_add_member_role` and `20261105120100_space_access` relabel every `ADMIN` user as `MEMBER` (no row is deleted), add `Space.platformStudio` (set to true on every space that already holds clients, documents, payments or missions) and add a nullable `Provider.spaceId` (existing providers stay shared).
- Existing sessions keep working until they expire; the next sign-in issues a `MEMBER` token.
- Registre's Ardoise clients can move back to `access_policy=everyone` once this is live.

### Security

- Facile SSO sign-in no longer makes anyone a global `ADMIN`. Every SSO user is `MEMBER`, which grants nothing by itself: their spaces and space roles come only from Registre's directory, and directory-provisioned users are `MEMBER` too.
- Platform powers are restricted to `PLATFORM_STAFF_SUBS`, checked server side by one middleware (`platformStaffProcedure`) that reads the user back from the database: `settings.getAdmin`, `settings.update` (Stripe secret and webhook keys, SMTP), the logo upload, the whole `admin.*` engine and audit logs, `billing.*` and the new `space.setPlatformStudio`. Empty means nobody.
- Tenant isolation: every procedure is classified (public, self, client portal, member, space-scoped, platform staff) in `packages/trpc/src/access.db.test.ts`, which fails on an unclassified procedure and calls every space-scoped one as a member of another space against Postgres, asserting `NOT_FOUND` or `FORBIDDEN`, no leaked ids and no change to that space.
- Providers belong to a space. A member sees and uses only their spaces' providers; legacy space-less providers are shared by platform studio spaces and only staff edit them. Documents, missions and sub-providers refuse a provider from another space. Provider logos must be files the caller uploaded, and a provider can no longer point at another space's document to download it.
- Only spaces marked `platformStudio` may use platform resources on their clients. Other spaces keep manual payments and documents. The check sits in each function that spends the resource, not in the routers:
  - payment receipts (`generateAndSendReceipt`, so `payment.retryReceipts` and the Stripe webhook too; `retryReceipts` also skips other spaces);
  - Stripe payments, cancellation, the billing portal and `payment.getClientSecret`;
  - payment requests and reminders;
  - welcome and magic-link emails;
  - Plume signatures and signing links;
  - Nuage archiving;
  - the outbound settings webhook (`dispatchConfiguredWebhook` now takes the event's space).
- `document.signatureEnabled` answers per space, and `client.transfer` refuses to move or copy a client with a portal account into a space outside the platform studio.
- A Registre space named like an unlinked local space adopts it only when every local owner owns the Registre space; otherwise it gets a fresh space, so it cannot inherit someone else's clients.
- Client portal procedures (`portal.*`, `client.me`, `payment.myPayments`, `payment.billingPortal`) answer `FORBIDDEN` to anyone but a CLIENT; space procedures answer `FORBIDDEN` to a CLIENT. `user.deleteOwnAccount` refuses SSO accounts, whose deletion would cascade to documents in shared spaces.

### Changed

- The web app opens `/admin` to members and shows the Entreprise, Facturation, Paiements, Email and Intégrations settings tabs only to platform staff. Creating a provider asks for its space.
- `adminProcedure` is gone; `UserRole` gains `MEMBER` (`ADMIN` stays as a legacy value equal to `MEMBER`). `@repo/auth-shared` exports `isMember` in place of `isAdmin`.

### Follow-ups (still platform-wide)

- Document numbering (`Settings.next*Number` and formats) is one counter for every space; tenants need their own sequence.
- Default payment terms, late fee, recovery fee and VAT exemption mention, and the company block on Stripe receipts, come from the platform `Settings`.
- Provider pickers list every provider the user can see; the server refuses one from another space, but the pickers should filter by the client's space.
- There is no UI for `space.setPlatformStudio` yet.

## [0.13.0] - 2026-11-04

### Security

- The generic admin engine (`admin.create`, `admin.update`) no longer writes a user's email, email verification, role, status or ban, and no longer creates users. Only first and last name stay editable.
- Media rows through the admin engine accept only `url`, `key`, `mimeType` and `size`. The generated Prisma schemas used before allowed nested writes on the linked avatar or cover user, including its email, role and SSO accounts. A guard test fails if any admin engine schema accepts a relation or foreign key.
- Facile SSO sign-in never links to or promotes a CLIENT row, even by verified email; it answers `client_account` and the login page points to the magic link.
- The Registre directory sync links a snapshot member to an existing local user by email only when the snapshot marks the email verified, and never to a client account. Registre does not send `email_verified` yet, so such members are skipped and logged. Accounts it provisions keep `emailVerified` false unless Registre verified the email.

### Added

- Suite billing backoffice at `/admin/offres` (Offres in the sidebar): features, versioned plans with monthly and yearly prices, a publish dialog with the diff and the subscribers it affects, subscriber migration, overrides, comped people and the subscriptions list. Published versions are immutable; editing means a new draft.
- **Security:** the backoffice and every `billing.*` procedure are restricted to Registre subjects in `BILLING_STAFF_SUBS`, read from the user's SSO identity, with `BILLING_STAFF_EMAILS` as a fallback only for emails Registre's snapshot marks verified. Every SSO sign-in is ADMIN, so the role alone is not enough. Empty means nobody. Every billing mutation writes an audit row with before and after.
- Comps are personal: a comped person gets the plan on their personal resources only. A space is comped only by an explicit "Espaces offerts" entry. Comps and person overrides match by Registre subject; `BILLING_SEED_COMP_SUBS` gives the seeded owners theirs.
- Publishing a version mirrors it to Stripe: product `plan_<key>`, prices with lookup keys `plan_<key>_month|year` (`transfer_lookup_key`), previous prices archived, idempotency keys on every write.
- Registre billing API: public `GET /api/catalog` (published versions only, cached 60 s) and, behind `BILLING_API_TOKEN` (32+ characters, constant-time SHA-256 compare, rate limited), `GET /billing/spaces/:spaceId`, `POST /billing/checkout` (one Stripe customer per space, price only from a published lookup key, owner checked against the Registre snapshot) and `POST /billing/portal`. Redirects must match `BILLING_REDIRECT_ORIGINS`.
- Entitlements resolution (override, owner comp, subscription plan with a 7-day past_due grace, defaults) pushed to Registre `PUT /api/directory/entitlements` with a monotonic revision on publish, webhook, override or comp change, directory change, at boot and every 10 minutes. Failures land in `EntitlementPushState.lastError` and never stop the server.
- Stripe subscription webhooks (`customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`) tagged with `registre_space_id` update `SpaceSubscription`, deduplicated through `BillingEvent` and cross-checked against the space's Stripe customer. A nightly reconcile repairs the rows. Client invoice payments keep their flow.
- `mise run billing:seed` (or `BILLING_SEED_ON_BOOT=true`) seeds six features, Solo, Pro and Studio as drafts and comps the four Facile Studio owners on Studio. With their subjects in `BILLING_SEED_COMP_SUBS`, they get Glouton access before anything is published.
- Checkout is serialised per space and refused while a session is open or a subscription has not ended. Billing webhook failures answer 500 so Stripe retries; the Stripe reconcile runs hourly. Billing routes are rate limited per token and per space.
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
