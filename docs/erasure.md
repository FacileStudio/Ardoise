# Erasure

When Registre erases a person, or a client deletes their own portal account, Ardoise anonymises
the account. It never deletes the account row and never touches an issued document.

## The rule

- The person's account stays as a tombstone. Its personal fields get a fixed placeholder: first name
  `Compte`, last name `supprimé`, email `erased-<user id>@erased.invalid`. `User.anonymizedAt`
  records when this happened.
- Everything that belongs only to the account goes: Registre identities, sessions, magic links,
  memberships, pending invitations, avatar files, personal comps and overrides, and the person's
  trace in audit rows.
- Invoices, quotes, contracts, payments and the records they hang off stay exactly as issued,
  numbers, totals, issuer and client blocks included.
- An anonymised account cannot sign in: it has no identity row left, its email matches nobody, and
  `loginBlockReason` refuses any row with `anonymizedAt` set. A later sign-in, with the old subject
  or the same email, creates a new account that sees none of the old one's work.
- Nothing financial is cancelled automatically: no Stripe call, no subscription change, no payment
  status change.

Why keep the documents: French tax and commercial law require a business to keep its invoices and
accounting records, unaltered, for several years. Erasure rights do not apply to data a business is
legally required to keep, so the issued records stay and only the account behind the login goes.

## How Ardoise learns of an erasure

Registre holds a self-deletion for 30 days, then deletes the account and writes one deletion notice
per suite application. Ardoise takes it two ways. Both call `erasePerson`
(`packages/trpc/src/modules/user/erasure.ts`, exported as `@repo/trpc/erasure`) with
`{ subject }`, which runs in one transaction under an advisory lock.

A client portal account (magic link, no Registre identity) erases itself with
`user.deleteOwnAccount`, which calls the same `erasePerson` with `{ userId }`: the same tombstone,
the same deletions, the same kept records. It scrubs every identity subject the account still
holds. Nothing goes back to Registre: Registre has no app-facing deletion call, a client has no
Registre account, and a Facile SSO account is refused here because the person deletes it on their
Registre account page, which then notifies Ardoise as above.

| Path | Where | Authentication | Answer |
|---|---|---|---|
| Poll | `GET <issuer>/api/directory/deletions`, every 10 minutes and at boot (`registre/deletions.ts`) | HTTP Basic with Ardoise's OIDC client, the same credential as the snapshot and the entitlement push | A failed person is listed again on the next poll. The whole 60-day window is read every time, so no cursor is saved |
| Push | `POST https://api-ardoise.facile.studio/api/registre/deletions` | Signed Security Event Token: JWS `typ` exactly `secevent+jwt`, RS256 against the issuer's JWKS, `iss`, `aud` = Ardoise's client id, live `exp`, at most one hour of life, the `https://schemas.facile.studio/event/user-deleted` event | `400` when the token does not verify, `503` when the issuer's keys cannot be read, `500` when the erasure failed, `202` only after the person was anonymised (`{"status":"erased"}`) or Ardoise holds nothing for that subject (`{"status":"unknown"}`) |

The push is live only once Registre's `ardoise` client has `deletion_uri` set to the push URL
above. The `ardoise` client is not in Registre's `seed.yaml`, so set it on the dashboard's client
page. Until then the poll does the work.

A subject is "unknown" when no `Account` row carries it (under either spelling of the issuer, with or
without the trailing slash) and no comp or override names it. A second notice for an erased person
lands there, because the first erasure deleted the identity row, so it answers success and writes
nothing. A replayed push token is harmless for the same reason.

## Field by field

Actions: **anonymise** (replaced by the placeholder), **delete** (row removed), **keep (legal
record)**, **keep (not personal)**.

| Model.field | Action | Notes |
|---|---|---|
| `User.id` | keep (not personal) | Random uuid. Kept documents point at it |
| `User.email` | anonymise | `erased-<id>@erased.invalid`, unique |
| `User.firstName`, `User.lastName` | anonymise | `Compte`, `supprimé` |
| `User.password` | anonymise | Set to null (legacy column) |
| `User.emailVerified` | anonymise | Set to false |
| `User.lastLoginAt`, `User.lastLoginIp` | anonymise | Set to null |
| `User.ssoPictureUrl`, `User.profileSyncedAt` | anonymise | Set to null |
| `User.banReason`, `User.bannedAt`, `User.suspensionReason` | anonymise | Set to null |
| `User.role`, `status`, `isBanned`, `isSuspended`, `suspendedUntil`, `bannedBy`, `createdAt` | keep (not personal) | |
| `User.anonymizedAt` | set | The erasure time |
| `Account` (identity `accountId` = subject, sealed SSO tokens) | delete | Every provider of the user |
| `Session` (refresh tokens, IP, user agent) | delete | Ends refresh; a 15-minute access token already issued runs out on its own |
| `MagicLink` | delete | |
| `AdminPermission` | delete | |
| `SpaceMember` | delete | The space and its work stay |
| `Invitation` sent by the person, or addressed to their email | delete | |
| `Media` avatar and cover rows, and their stored files | delete | Files go before the transaction |
| `CompedPerson` with the person's subject or email | delete | |
| `EntitlementOverride` of scope `person` with the person's subject or email | delete | |
| `EntitlementOverride.createdBy`, `CompedSpace.createdBy` equal to the person's email | anonymise | Row kept, author becomes the placeholder email |
| `AuditLog.ipAddress`, `AuditLog.userAgent` on the person's own rows | anonymise | Set to null |
| `AuditLog.changes` | anonymise | The person's email and subject become the placeholder; their first and last name too, in rows about their own user |
| `AuditLog` row, `userId`, `entity`, `entityId`, `action`, `createdAt` | keep (legal record) | The trail of who changed what, now pointing at the tombstone |
| `Document` (every type: `devis`, `facture_prestation`, `appel_de_fonds`, contracts, `prestation_*`) | keep (legal record) | Untouched, `updatedAt` included. `providerName`, `providerEmail`, `providerPhone` and the rest of the issuer block, the client block, `name`, `items`, `serviceData`, numbers, totals, `pdfUrl`, `pdfHash` |
| `Document.createdBy` | keep (legal record) | Points at the tombstone |
| Stored PDFs under `uploads/<user id>/` | keep (legal record) | The folder name is the uuid, not the person |
| `Payment`, `PaymentInvoice`, `PaymentDocument`, `PaymentLink` | keep (legal record) | Untouched |
| `Client` (a space's customer) | keep (legal record) | Untouched; see the cases below for a `Client.userId` link |
| `Mission`, `MissionProvider`, `Prestation` | keep (legal record) | Untouched |
| `Provider` | keep (not personal) | The space's issuing business; see the cases below |
| `Space`, `SpaceSettings`, `DocumentCounter`, `SpaceSubscription`, `CompedSpace` | keep (not personal) | Keyed on the space, never on the person |
| `Settings` | keep (not personal) | Platform company identity |
| `Feature`, `Plan*`, `BillingEvent`, `EntitlementPushState`, `DuplicateSubscription`, `WebhookEvent`, `Verification` | keep (not personal) | No person field |

Ardoise has no credit-note model and no API-token model: the only bearer credentials are sessions
and magic links, both deleted.

## Reading the leftover check after a real erasure

`scripts/erasure-check.sh <subject> <email>` in the Mycelium repository counts, for every text and
uuid column of Ardoise's database, the rows equal to the subject or the email (case-insensitive).
After an erasure Ardoise handled, these counts are expected and lawful:

| Table.column | Why it may be non-zero |
|---|---|
| `Document.providerEmail` | The person's email printed as the issuer contact on documents issued before the erasure |

These may be non-zero and are left for the owner to decide (see below), not a failure of the
erasure code:

| Table.column | Why |
|---|---|
| `Provider.email` | A provider record (the space's issuing business) that uses the person's own email |
| `Client.contactEmail` | The person is also recorded as a customer contact of some space |
| `Settings.companyEmail` | The platform company email is the person's |

Any other non-zero count is a failure: `User.email`, `Account.accountId`, `Session.*`,
`Invitation.email`, `CompedPerson.*`, `EntitlementOverride.*` and `CompedSpace.createdBy` must all
read zero. The script does not scan names or `jsonb`, so it cannot see `Document.providerName` or
`AuditLog.changes`; the DB test (`apps/backend/src/registre/erasure.db.test.ts`) does, for both paths.

## Cases left to the owner

- **A space whose only member was the erased person.** The space, its clients, invoices, payments
  and any `SpaceSubscription` stay. Nothing is cancelled. Registre normally hands the space to
  another member first; if nobody is left, the records sit in a space nobody can open until staff
  assign one.
- **Open subscriptions or unpaid invoices of such a space.** Kept as they are. Stripe customers and
  subscriptions are not touched, so a Stripe customer may still carry the person's email
  (`owner_email`). Cancelling or editing them is a manual decision.
- **`Provider` rows that are the person's own business** (a freelancer invoicing under their name).
  Kept, because the space issues new documents from them. Anonymising them would change what future
  invoices print.
- **A `Client` row linked to the erased account** (`Client.userId`). Unreachable today: clients
  sign in with magic links and never hold a Registre identity. If it ever happens the client row
  stays untouched.
- **Accounts never linked to a Registre identity** (signed in only before Registre, with an old
  `oidc` provider row). A notice names a subject only, so Ardoise cannot map it to them and answers
  "unknown". Find and erase them by hand if a person asks.
- **Audit rows that mention the person by a former name** (one that differs from the name on the
  account at erasure). Only the current name is scrubbed.
- **A client who deletes their own account** keeps their `Client` row (contact name and email
  included) and its payments, missions and documents: they are the space's customer record. Before
  this went through `erasePerson`, the `User` delete cascaded to the `Client` row and its payments,
  and failed outright once the client had a mission.
- **The push needs a dashboard edit.** Set `deletion_uri` on Registre's `ardoise` client to
  `https://api-ardoise.facile.studio/api/registre/deletions` for erasures within minutes instead of
  at the next poll.
