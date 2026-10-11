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
| `login` | mutation | public | `{ email, password }`, password min 8 |
| `refresh` | mutation | public | `{}` — reads the `refresh_token` cookie |
| `me` | query | protected | `{}` |
| `logout` | mutation | protected | `{}` |

`login` and `refresh` set `auth_token` (15 min, `Path=/`) and `refresh_token` (7
days, `Path=/trpc/auth.refresh`) as `HttpOnly` `SameSite=Lax` cookies. `logout` clears both.
`me` returns the context user. This router sits behind the strictest rate-limit bucket.

## `user`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `me` | query | protected | — |
| `updateProfile` | mutation | protected | `{ firstName?, lastName? }` |
| `changePassword` | mutation | protected | `{ currentPassword, newPassword }`, new min 8 |
| `deleteOwnAccount` | mutation | protected | — |
| `list` | query | admin | `{ role?: 'all' \| 'admin' \| 'user' }?` |
| `getById` | query | admin | `{ id }` |
| `getStats` | query | admin | — |
| `create` | mutation | admin | `{ email, password, firstName, lastName, role: 'CLIENT' \| 'ADMIN' }` |
| `update` | mutation | admin | `{ id, role? }` |
| `adminUpdate` | mutation | admin | `{ id, email?, firstName?, lastName?, role?, password? }` |
| `delete` | mutation | admin | `{ id }` |
| `bulkDelete` | mutation | admin | `{ ids: string[] }` |

## `client`

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | admin | `{ page = 1, limit = 10 (max 100), search?, spaceId? }` |
| `getById` | query | admin | `{ id }` |
| `create` | mutation | admin | contact name, `companyName`, optional billing address, `siret`, `tvaIntracom`, plus `createCredentials` and optional `credentialEmail` / `credentialPassword` to provision a portal login |
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

A mission groups the documents and payments of one job for one client, with one or more providers. Every procedure is admin-only and scoped by space like `client` and `payment`.

| Procedure | Type | Level | Input |
|---|---|---|---|
| `list` | query | admin | `{ page = 1, limit = 20 (max 100), status?, clientId?, search?, spaceId? }` |
| `getById` | query | admin | `{ id }` — client, providers, documents and payments |
| `create` | mutation | admin | `{ name, clientId, description?, providers = [{ providerId, role = 'LEAD' }], spaceId? }` |
| `update` | mutation | admin | `{ id, name?, description?, providers? }` — `providers` replaces the whole list |
| `setStatus` | mutation | admin | `{ id, status }` |
| `attachDocument` | mutation | admin | `{ id, documentId }` |
| `detachDocument` | mutation | admin | `{ id, documentId }` |
| `createPayment` | mutation | admin | `{ id, documentId, collectionMethod = 'STRIPE', frequency = 'ONE_TIME', dueDate? }` |
| `delete` | mutation | admin | `{ id }` |

`status` is `DRAFT`, `QUOTED`, `ACCEPTED`, `INVOICED`, `PAID` or `CANCELLED`. `setStatus` follows
a fixed map: `DRAFT` to `QUOTED`, `QUOTED` to `DRAFT` or `ACCEPTED`, `ACCEPTED` to `INVOICED`,
`INVOICED` to `PAID`, and any of those but `PAID` to `CANCELLED`. `PAID` and `CANCELLED` are final.
`role` is `LEAD` or `SUBCONTRACTOR`; a provider can be linked once.

`createPayment` bills one invoice of the mission through the `payment` service. The amount is
`Document.total`, the reference is the invoice number, and `dueDate` defaults to the request date
plus the document's `paymentTermsDays`. It refuses a document that has no `invoiceNumber`, a
cancelled mission, and an invoice that already has a `PENDING`, `PAID` or `PAST_DUE` payment. An
`ACCEPTED` mission becomes `INVOICED`.

A mission becomes `PAID` by itself when every invoice it holds has a `PAID` payment. That
happens on the Stripe `payment_intent.succeeded` and `invoice.payment_succeeded` events and when an
admin sets a payment to `PAID` with `payment.update`. Only an `INVOICED` mission moves.

`delete` refuses a mission that holds an issued invoice or any payment. Quotes and contracts
are detached, not deleted. `attachDocument` refuses a document that belongs to another mission.

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
| `list` | query | admin | `{ page = 1, limit = 20 (max 100), search?, spaceId? }` |
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

## `docuseal`

Proxies a DocuSeal instance configured in `Settings`. All admin-level.

| Procedure | Type | Input |
|---|---|---|
| `isConfigured` | query | — |
| `listSubmissions` | query | `{ limit?, after?, before?, template_id?, status? }?` |
| `getSubmission` / `deleteSubmission` | query, mutation | `{ id: number }` |
| `createSubmission` | mutation | `{ template_id, submitters[{ role, email?, phone?, name?, values?, metadata? }], send_email?, send_sms?, reply_to?, message?, metadata? }` |
| `createSubmissionFromPdf` | mutation | PDF payload plus submitters |
| `listTemplates` | query | pagination filters |
| `getTemplate` / `getSubmitter` | query | `{ id: number }` |
| `updateSubmitter` | mutation | `{ id }` plus submitter fields |

DocuSeal ids are numbers, not the cuid strings used everywhere else in this API.

## Plain HTTP routes

Not tRPC — these exist because of raw bodies, redirects, or callers that cannot speak tRPC.

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/webhook` | Stripe signature | Stripe events. Idempotent via `WebhookEvent` |
| `GET` | `/auth/config` | none | Whether OIDC is enabled |
| `GET` | `/auth/oidc` | none | Starts the OIDC authorization flow |
| `GET` | `/auth/oidc/callback` | none | Exchanges the code, signs in an existing user, sets auth cookies, redirects to `OIDC_SUCCESS_URL` with `?oidc=success` or `?error=<code>` |
| `PUT` | `/storage/*` | `?ticket=` HMAC | Uploads a file body to that key |
| `GET` | `/storage/*` | `?ticket=` HMAC | Downloads it |
| `GET` | `/docs` | none | Scalar API reference UI |
| `GET` | `/docs/openapi.json` | none | Generated OpenAPI document |
| `GET` | `/version` | none | Backend version |
| `GET` | `/health` | none | Full probe: `api`, `database`, `storage` with latencies |
| `GET` | `/health/live` | none | Liveness |
| `GET` | `/health/ready` | none | Readiness |
| `GET` | `/` | none | `{ message: "Ardoise API", version }` |

Storage tickets are HMACs over the method and key signed with `ENCRYPTION_SECRET`. They are not
S3 pre-signed URLs — the file is served by the Hono process off the local volume.
