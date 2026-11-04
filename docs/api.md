# Ardoise — API

The tRPC router tree is the API. Every procedure below is reachable at
`POST|GET /trpc/<router>.<procedure>` on the backend; a handful of plain HTTP routes sit beside
it for things tRPC cannot carry. Generated from `packages/trpc/src/` and
`apps/backend/src/index.ts`.

## Access levels

| Level | Middleware | Requirement |
|---|---|---|
| public | logging | none |
| protected | logging, `isAuthed` | a valid `auth_token` cookie or `Authorization: Bearer` token |
| admin | logging, `isAuthed`, `isAdmin` | the above plus `role = ADMIN` |

Failures come back as tRPC errors: `UNAUTHORIZED` ("Please log in."), `FORBIDDEN` ("Access
restricted to administrators."), `NOT_FOUND`. In production, `INTERNAL_SERVER_ERROR` messages are
replaced with a generic string and stacks are stripped.

A Scalar API reference is served at `GET /docs`, over an OpenAPI document at
`GET /docs/openapi.json` — the same two paths every Facile backend uses.

The document is produced by `trpc-to-openapi` from the tRPC router, but **no procedure declares
`.meta({ openapi: … })`**, so it currently ships an empty `paths` object. It does not document the
tRPC procedures, and it does not document the plain Hono routes below either. Adding `openapi`
meta to the procedures you want exposed is what fills it in.

## `auth`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `refresh` | mutation | public | `{}` — reads the `refresh_token` cookie |
| `me` | query | protected | `{}` |
| `logout` | mutation | protected | `{}` |

`refresh` sets `auth_token` (15 min, `Path=/`) and `refresh_token` (7
days, `Path=/trpc/auth.refresh`) as `HttpOnly` `SameSite=Lax` cookies. `logout` clears both.
`me` returns the context user. This router sits behind the strictest rate-limit bucket.

## `magicLink`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `request` | mutation | public | `{ email }`. Always returns `{ ok: true }`, whether or not a link was sent |
| `consume` | mutation | public | `{ token }`. Sets the same cookies as `auth.refresh` and returns `{ user }`. Unknown, expired and used tokens all fail with `This link is invalid or has expired` |

Only active CLIENT users receive a link. Both procedures share the strict rate-limit bucket, and `request` is also capped per email and per IP per hour. See
`docs/architecture.md` for the flow.

## `user`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `me` | query | protected | — |
| `updateProfile` | mutation | protected | `{ firstName?, lastName? }`. Clients only: staff names come from Facile SSO |
| `deleteOwnAccount` | mutation | protected | — |

## `client`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | admin | `{ page = 1, limit = 10 (max 100), search?, spaceId? }` |
| `getById` | query | admin | `{ id }` |
| `create` | mutation | admin | `spaceId` (required), contact name, `companyName`, optional billing address, `siret`, `tvaIntracom`, plus `createCredentials` and `credentialEmail` to give the client portal access. The user has no password and gets a welcome mail with a sign-in link |
| `update` | mutation | admin | `{ id }` plus the same fields, all optional |
| `delete` | mutation | admin | `{ id }` — refused while the client has payments or missions |
| `me` | query | protected | — the signed-in user's own client record |

## `payment`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | admin | `{ page = 1, limit = 20 (max 100), status?, clientId?, spaceId? }` |
| `getById` | query | admin | `{ id }` |
| `create` | mutation | admin | `{ clientId, amount > 0, description, frequency = 'ONE_TIME', collectionMethod = 'STRIPE', reference?, dueDate, attachedFiles = [], attachedDocumentIds = [], missionId?, documentId? }` — `missionId` and `documentId` must belong to the client's space |
| `update` | mutation | admin | `{ id }` plus any of amount, description, dueDate, status, collectionMethod, reference, attachments |
| `cancel` | mutation | admin | `{ id }` |
| `sendReminder` | mutation | admin | `{ id }` |
| `markExpired` | mutation | admin | — sweeps past-due pending payments |
| `retryReceipts` | mutation | admin | — retries failed receipt generation |
| `myPayments` | query | protected | — the caller's own payments |
| `billingPortal` | mutation | protected | `{ id }` — returns a Stripe billing portal session |
| `getByIdPublic` | query | public | `{ id }` — the payment page a client opens from their email |
| `getClientSecret` | query | public | `{ id }` — Stripe Payment Intent client secret for Elements |
| `handleWebhook` | mutation | public | `{ signature, body }` |

`status` is `PENDING`, `PAID`, `PAST_DUE`, `FAILED`, `EXPIRED` or `CANCELLED`. `frequency` is
`ONE_TIME`, `MONTHLY` or `YEARLY`. `collectionMethod` is `STRIPE` or `MANUAL`. This router has its
own rate-limit bucket. Stripe normally reaches the plain `POST /webhook` route rather than
`handleWebhook`.

## `mission`

A mission is one job for one client, with one or more providers. It holds the prestations (the
billable lines), and the quotes, invoices, contracts and payments built from them. Every procedure
is admin-only and scoped by space like `client` and `payment`.

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | admin | `{ page = 1, limit = 20 (max 100), status?, clientId?, search?, spaceId? }` |
| `getById` | query | admin | `{ id }`: client, providers, prestations, documents, payments and a `billing` object |
| `create` | mutation | admin | `{ name, clientId, description?, depositPercent?, providers = [{ providerId, role = 'LEAD' }], spaceId? }`. The mission takes the space of its client |
| `update` | mutation | admin | `{ id, name?, description?, depositPercent?, providers? }`: `providers` replaces the whole list, `depositPercent: null` removes the deposit |
| `setPrestations` | mutation | admin | `{ id, prestations: [{ description, quantity, unit = 'jour', unitPrice, providerId? }] }`: replaces every line |
| `generateQuote` | mutation | admin | `{ id, validityDays = 30 }` |
| `acceptQuote` | mutation | admin | `{ id, documentId }` |
| `generateInvoice` | mutation | admin | `{ id, kind = 'TOTAL', dueDate? }`: `kind` is `TOTAL` or `DEPOSIT` |
| `createPayment` | mutation | admin | `{ id, documentId, collectionMethod = 'STRIPE', frequency = 'ONE_TIME', dueDate? }` |
| `attachDocument` | mutation | admin | `{ id, documentId }` |
| `detachDocument` | mutation | admin | `{ id, documentId }` |
| `setStatus` | mutation | admin | `{ id, status }` |
| `delete` | mutation | admin | `{ id }` |

### From prestations to invoices

The prestations are the source. A quote and an invoice are generated from them on request, and an
issued document is never edited.

1. `setPrestations` replaces the lines. A provider on a line must be linked to the mission.
2. `generateQuote` freezes the lines into a `devis` document with the next `version`, and records
   the deposit percentage it quoted in `serviceData`. It refuses a mission with no line, a mission
   whose latest quote already matches its lines, and a mission with no provider to issue it. The
   issuer is the `LEAD` provider, or the first one. Each version gets its own quote number.
3. `acceptQuote` sets `acceptedAt` on the latest quote. It refuses an older quote, and a quote
   the lines have moved away from.
4. `generateInvoice` bills the accepted quote, and refuses while the lines or the deposit
   percentage differ from it. Amounts are computed in cents.
   - `TOTAL` with no deposit invoice yet makes a `FULL` invoice of every line.
   - `DEPOSIT` makes a `DEPOSIT` invoice of `depositPercent` of the quote total excluding tax. It
     needs a `depositPercent` on the mission and allows one deposit per mission.
   - `TOTAL` after a deposit makes a `BALANCE` invoice: every line, minus one negative line for
     each deposit already billed.
   The invoice stores `invoiceKind`, `sourceQuoteId` and `dueDate`, and prints the source quote
   number. The due date defaults to the invoice date plus the default payment terms.

Changing a line or the deposit percentage after a quote makes that quote outdated. `getById`
reports it, and a quote or an invoice cannot be built on an outdated quote. Once a `FULL` or
`BALANCE` invoice exists the lines are locked. A deposit alone leaves them editable, so a changed
scope gets a new quote and a smaller balance.

`getById` returns a `billing` object with the flags the UI needs: `locked`, `quoteOutdated`,
`needsQuote`, `currentQuoteId`, `canEditPrestations`, `canGenerateQuote`, `canAcceptQuote`,
`canInvoiceDeposit` and `canInvoiceTotal`. The same rules are enforced again by each procedure.

### Status

`status` is `DRAFT`, `QUOTED`, `ACCEPTED`, `INVOICED`, `PAID` or `CANCELLED`. It follows events:

| Event | Effect |
|---|---|
| `generateQuote` | `DRAFT`, `QUOTED` or `ACCEPTED` becomes `QUOTED` |
| `acceptQuote` | `QUOTED` becomes `ACCEPTED` |
| `generateInvoice` | `ACCEPTED` becomes `INVOICED` |
| `createPayment` | `ACCEPTED` becomes `INVOICED` (an invoice attached by hand) |
| `setPrestations` leaving a quote outdated | `QUOTED` or `ACCEPTED` becomes `DRAFT` |
| every invoice paid, with a `FULL` or `BALANCE` one among them | `INVOICED` becomes `PAID` |

The payment event is the Stripe `payment_intent.succeeded` or `invoice.payment_succeeded` event,
or an admin setting a payment to `PAID` with `payment.update`. A paid deposit alone does not
settle the mission. `setStatus` is the manual escape hatch and follows a fixed map: `DRAFT` to
`QUOTED` or `CANCELLED`, `QUOTED` to `DRAFT`, `ACCEPTED` or `CANCELLED`, `ACCEPTED` to `INVOICED`
or `CANCELLED`, `INVOICED` to `PAID` or `CANCELLED`. `PAID` and `CANCELLED` are final. `role` is
`LEAD` or `SUBCONTRACTOR`; a provider can be linked once.

### Payments and documents

`createPayment` bills one invoice of the mission through the `payment` service. The amount is
`Document.total` and the reference is the invoice number. The due date is the one given, else the
invoice's own `dueDate`, else the request date plus the document's `paymentTermsDays`. It refuses a
document that has no `invoiceNumber`, a cancelled mission, and an invoice that already has a
`PENDING`, `PAID` or `PAST_DUE` payment.

`attachDocument` links a document made elsewhere, such as a contract, and refuses one that belongs
to another mission. `detachDocument` refuses a document with a live payment, and refuses a
generated quote or invoice. `delete` refuses a mission that holds an issued invoice or any payment,
and deletes its quotes. Contracts are detached, not deleted.

## `document`

Generates Typst-rendered PDFs. Every generator comes as a `preview*` / `create*` pair taking the
same input — preview renders without persisting, create writes a `Document` row and stores the
PDF.

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | admin | `{ page = 1, pageSize = 20 (max 100), search?, type?, spaceId? }` |
| `get` | query | admin | `{ id }` |
| `delete` | mutation | admin | `{ id }` |
| `types` | query | admin | — the six document types offered in the UI, with French labels |
| `download` | mutation | admin | `{ id }` |
| `previewFacturePrestation` / `createFacturePrestation` | mutation | admin | `{ invoice_date, due_date, clientId, providerId, items[], railway_estimate = 0 }` |
| `previewMaintenance` / `createMaintenance` | mutation | admin | `{ quote_date, validity_date, maintenance_period, clientId, providerId, items[], railway_estimate = 0 }` |
| `previewContratPrestation` / `createContratPrestation` | mutation | admin | service contract inputs |
| `previewContratMaintenance` / `createContratMaintenance` | mutation | admin | maintenance contract inputs |
| `previewBackContractuel` / `createBackContractuel` | mutation | admin | co-contracting inputs, including per-provider `amount_to_pay` |
| `previewAppelDeFonds` / `createAppelDeFonds` | mutation | admin | capital-call inputs |
| `previewPrestationBarman` … `createPrestationBtp` | mutation | admin | seven trade-specific invoice variants — barman, photo, video, design, dev, formation, btp |

Each `items` entry is `{ description, quantity > 0, unit, price >= 0 }`. Note that `types`
returns only six values while the `DocumentType` enum has thirteen — the seven trade variants are
reachable through their own procedures but are not listed in that picker.

## `provider`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | admin | `{ page = 1, limit = 20 (max 100), search? }`. Providers are shared by every space |
| `get` | query | admin | `{ id }` |
| `create` | mutation | admin | `{ name }` plus optional legal identity (`legalName`, `siret`, `tvaIntracom`, `legalForm`, `shareCapital`, `rcsCity`, `apeCode`), address, contact, `bankName` / `iban` / `bic`, `logoUrl`, `country = 'France'`, `tvaRate = 20` |
| `update` | mutation | admin | `{ id }` plus a partial of the above |
| `delete` | mutation | admin | `{ id }` |

Empty strings are preprocessed to `undefined`, so blanking a form field clears it rather than
storing `""`.

## `space`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | protected | — |
| `get` | query | protected | `{ id }` |
| `create` | mutation | protected | `{ name (1–100), description? (max 500) }` |
| `update` | mutation | protected | `{ id, name?, description? }` |
| `delete` | mutation | protected | `{ id }` |
| `getMembers` | query | protected | `{ id }` |
| `addMember` | mutation | protected | `{ spaceId, email, role = 'MEMBER' }` |
| `removeMember` | mutation | protected | `{ spaceId, userId }` |
| `updateMemberRole` | mutation | protected | `{ spaceId, userId, role }` |
| `leave` | mutation | protected | `{ spaceId }` |

`role` is `OWNER`, `ADMIN` or `MEMBER` — a space-local role, unrelated to the global `UserRole`.

## `settings`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `get` | query | public | — public subset, for the payment page and branding |
| `getAdmin` | query | admin | — the full settings row including secrets |
| `update` | mutation | admin | every settings field, all optional; Stripe keys validated by prefix (`sk_`, `pk_`, `whsec_`), `tvaRate` 0–100, `smtpPort` 1–65535 |
| `requestLogoUpload` | mutation | admin | `{ fileName, fileType }` |
| `confirmLogoUpload` | mutation | admin | `{ logoUrl }` |

## `media`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `getUploadUrl` | mutation | protected | `{ fileName, fileType }` — returns a ticketed `/storage/*` URL |
| `getDownloadUrl` | query | protected | `{ url }` |
| `updateAvatar` | mutation | protected | `{ url, key, size }` |
| `updateCover` | mutation | protected | `{ url, key, size }` |
| `removeAvatar` | mutation | protected | — |
| `removeCover` | mutation | protected | — |

## `admin`

A generic CRUD engine over registered entities, backed by `AdminPermission` and `AuditLog`.
Every procedure is admin-level.

| Procedure | Type | Input |
|---|---|---|
| `getEntities` | query | — |
| `getEntityConfig` | query | `{ entity }` |
| `list` | query | `{ entity, options?: { page?, pageSize?, search?, sortBy?, sortOrder?, filters? } }` |
| `get` | query | `{ entity, id }` |
| `create` | mutation | `{ entity, data }` |
| `update` | mutation | `{ entity, id, data }` |
| `delete` | mutation | `{ entity, id }` |
| `getPermissions` / `getUserPermissions` | query | `{ entity }` |
| `setPermissions` | mutation | `{ userId, entity, permissions: { canCreate, canRead, canUpdate, canDelete } }` |
| `getAuditLogs` | query | `{ entity, entityId }` |
| `getAllAuditLogs` | query | `{ entity?, userId?, action?: 'CREATE' \| 'UPDATE' \| 'DELETE', limit?, offset? }` |

`data` and `filters` are untyped records — the shape is validated by the entity registry in
`packages/admin`, not by the tRPC input schema.

## `billing`

The suite billing backoffice. Every procedure except `access` runs `billingStaffProcedure`: the
caller is read back from the database and must be an active ADMIN with a verified email listed in
`BILLING_STAFF_EMAILS`. A plain ADMIN gets `FORBIDDEN`. Every mutation writes an `AuditLog` row
(`entity` `billing.*`, `changes: {before, after}`).

| Procedure | Type | What it does |
|---|---|---|
| `access` | query | `{ staff }`, for the sidebar and the `/admin/offres` server guard |
| `features`, `saveFeature` | query, mutation | List, create or update features. Key `app.feature`, kind fixed after creation |
| `plans`, `savePlan` | query, mutation | Plans with their versions and live subscriber counts |
| `version`, `createDraft`, `saveDraft`, `deleteDraft` | query, mutations | A version's values and prices. Only drafts change; `createDraft` copies the latest version |
| `previewPublish`, `publish` | query, mutation | Diff against the published version and subscribers affected, then publish: Stripe product `plan_<key>`, prices with lookup key `plan_<key>_<interval>` and `transfer_lookup_key`, previous prices and version archived |
| `migrateSubscribers` | mutation | `{ planId, mode: 'period_end' \| 'immediate' }` moves live subscriptions on older versions to the published price |
| `overrides`, `createOverride`, `deleteOverride` | query, mutations | Space or person overrides with reason and optional expiry |
| `comps`, `saveComp`, `deleteComp` | query, mutations | Comped people (latest version of the plan, even a draft) |
| `subscriptions`, `pushState`, `pushNow` | queries, mutation | Mirrored subscriptions, the last Registre push, and a push on demand |

## Plain HTTP routes

Not tRPC — these exist because of raw bodies, redirects, or callers that cannot speak tRPC.

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/webhook` | Stripe signature | Stripe events. Subscription and invoice events whose metadata carries `registre_space_id` go to the billing module (idempotent via `BillingEvent`); everything else goes to the client-invoice payment flow (idempotent via `WebhookEvent`) |
| `GET` | `/api/catalog` | none | Published plan versions: `{plans:[{key, name, features, prices:[{interval, amount, currency, lookup_key}]}]}`. Cached 60 s, rate limited |
| `GET` | `/billing/spaces/{spaceId}` | Bearer `BILLING_API_TOKEN` | `{plan, status, current_period_end, comped, entitlements}` for a Registre space |
| `POST` | `/billing/checkout` | Bearer `BILLING_API_TOKEN` | `{space_id, space_name, owner_email, lookup_key, success_url, cancel_url}` -> `{url}`. The price comes only from the lookup key of a published version; the space must be in the Registre snapshot and `owner_email` one of its owners. 409 when the space already has a live subscription |
| `POST` | `/billing/portal` | Bearer `BILLING_API_TOKEN` | `{space_id, return_url}` -> `{url}` (Stripe billing portal). The three `/billing/*` routes answer 404 when the token is unset or short, 401 on a wrong token, 400 on an unknown field or a redirect off `BILLING_REDIRECT_ORIGINS`, 413 over 16 KiB, 429 over 60 calls a minute per IP |
| `POST` | `/webhooks/plume` | `x-plume-signature-256` HMAC | Plume `document.completed`, `document.declined` and `document.archived` events, matched by `external_ref` `ardoise:contract:<id>`. 404 when Plume is not configured |
| `POST` | `/api/integrations/glouton/clients` | Bearer `GLOUTON_API_TOKEN` | Creates a client from a Glouton `ClientPayload`, or updates the one already linked to its `gloutonCompanyId`. Answers `{data:{id, updatedAt}}` |
| `PUT` | `/api/integrations/glouton/clients/{id}` | Bearer `GLOUTON_API_TOKEN` | Updates and links that client. A payload whose `updatedAt` is not newer than the stored one changes nothing and answers `skipped: true` |
| `POST` | `/api/integrations/glouton/clients/{id}/unlink` | Bearer `GLOUTON_API_TOKEN` | Clears `gloutonCompanyId` |
| `GET` | `/api/integrations/glouton/clients/{id}` | Bearer `GLOUTON_API_TOKEN` | `{data: ClientPayload}`. All four answer 404 when Glouton is not configured, 401 on a wrong token, 400 on an invalid payload, 422 when `registreSpaceId` is null or matches no space |
| `GET` | `/auth/config` | none | Whether OIDC is enabled |
| `GET` | `/auth/oidc` | none | Starts the OIDC authorization flow |
| `GET` | `/auth/oidc/callback` | none | Exchanges the code, signs in an existing user, sets auth cookies, redirects to `OIDC_SUCCESS_URL` with `?oidc=success` or `?error=<code>` |
| `PUT` | `/storage/*` | `?ticket=` HMAC | Uploads a file body to that key |
| `GET` | `/storage/*` | `?ticket=` HMAC | Downloads it |
| `GET` | `/docs` | none | Scalar API reference UI |
| `GET` | `/docs/openapi.json` | none | Generated OpenAPI document |
| `GET` | `/version` | none | `{ "version": "<tag, commit or dev>" }`, stamped at image build |
| `GET` | `/health` | none | Full probe: `api`, `database`, `storage` with latencies |
| `GET` | `/health/live` | none | Liveness |
| `GET` | `/health/ready` | none | Readiness |
| `GET` | `/` | none | `{ message: "Ardoise API", version }` |

Storage tickets are HMACs over the method and key signed with `ENCRYPTION_SECRET`. They are not
S3 pre-signed URLs — the file is served by the Hono process off the local volume.
