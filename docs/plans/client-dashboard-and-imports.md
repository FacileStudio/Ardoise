# Plan: client dashboard, manual data and document import

Status: approved by the owner, 2026-11-01. Target release v0.7.0.

## Decisions

| Question | Decision |
|---|---|
| Layout | One page at `/app`: summary cards, then Projects, Documents, Payments sections. |
| Client-visible documents | `devis`, `facture_prestation`, `appel_de_fonds`, `contrat_prestation`, `contrat_maintenance`, `back_contractuel`, `maintenance`, linked to the client's own missions or payments. No internal types. |
| Sign link | "Sign" button when `signatureStatus` is `sent`. It opens the client's own Plume `signing_url`, not the owner page in `plumeUrl`. |
| Import | Upload the PDF and fill a form. Stored as-is, flagged `source = imported`, dated by `issuedAt`. |
| Old payments | An imported invoice marked paid creates a `Payment` with `collectionMethod = MANUAL`, `status = PAID`, `paidAt`. |
| Manual CRUD | Everything an admin touches is editable and deletable: documents, payments, missions, prestations, clients, providers. Deletes of referenced records explain what blocks them. |
| Signature | Both paths. Manual: admin sets the status and date and uploads the signed PDF. Plume: send as today, status follows the webhook. |

## Schema (done in the plan commit)

- `DocumentSource` enum: `generated`, `imported`.
- `Document.source`, `Document.issuedAt` (the real date for imports, null means `createdAt`), `Document.plumeClientSignUrl`.
- Migration `20261101180000_add_document_import_fields`.

## Workstreams

Four agents, disjoint files. Each runs typecheck for its own workspace, no commits. The lead integrates, runs `filet check`, typecheck and lint, then ships.

### A. Backend: documents and payments by hand (`packages/trpc/src/modules/document`, `payment`, `mission`, `packages/plume`)

- `document.import`: PDF key (uploaded through the existing media/storage flow), type, name, number, client, mission, provider, items or a single total, issue date, `signatureStatus`, `signedAt`, optional `markPaid` with `paidAt`. Creates the `Document` (`source = imported`) and, for paid invoices, a MANUAL PAID `Payment` linked to document and mission.
- `document.update`: edit any field of a generated or imported document, replace or clear the PDF. Editing a generated document marks its stored PDF stale (admin can regenerate).
- `document.setSignature`: manual status, date and signed PDF.
- `payment.createManual`, `payment.update`, `payment.setStatus` (mark paid or unpaid), `payment.delete` for MANUAL payments. Stripe payments stay read-mostly.
- Audit `mission`, `client`, `provider` routers: update and delete exist, guards on referenced rows return a clear `PRECONDITION_FAILED` message.
- `packages/plume`: `getSigners(config, documentId)` returning each signer's email and `signing_url`. `sendForSignature` returns the client's `signing_url`, stored in `plumeClientSignUrl`. A backfill path fetches it lazily for documents sent before this release.
- Tests: one `bun test` per new procedure group, no fixtures beyond the existing mocks.

### B. Backend: client portal API (`packages/trpc/src/modules/portal`, new)

`protectedProcedure` only, scoped to the caller's `Client` (and its space). Contract the UI codes against:

```ts
portal.overview: () => {
  client: { id, companyName, contactFirstName, contactLastName },
  totals: { billed: number, paid: number, due: number, overdue: number, currency: 'EUR' },
  missions: Array<{
    id, name, status, description | null,
    price: number,
    paid: number,
    due: number,
    nextDueDate: string | null,
    documentCount: number,
    pendingSignatureCount: number
  }>,
  actionRequired: Array<
    | { kind: 'pay', paymentId, description, amount, dueDate, overdue: boolean }
    | { kind: 'sign', documentId, name, missionName | null }
  >
}
portal.documents: (input?: { missionId?: string, type?: string }) => Array<{
  id, name, type, typeLabelKey, missionId | null, missionName | null,
  number | null, issuedAt: string, total: number | null,
  signatureStatus: 'none' | 'sent' | 'signed' | 'declined',
  signedAt | null, canDownload: boolean, source: 'generated' | 'imported'
}>
portal.documentDownload: ({ id }) => { url: string }
portal.signLink: ({ id }) => { url: string }
```

- Mission price is the sum of the prestation lines (`quantity * unitPrice`, plus VAT per the existing billing math in `mission/billing-math.ts`; reuse it). Paid and due come from the mission's payments.
- `portal.signLink` returns `plumeClientSignUrl`, fetching and storing it from Plume if missing. It refuses documents not in `sent`.
- Visible types as listed in the decisions table. Another client's id answers `NOT_FOUND`.
- Tests: scoping (client A cannot read client B), type filter, totals math.

### C. Web: client dashboard (`apps/web/src/routes/app`, `apps/web/src/lib/ui`)

Replaces `apps/web/src/routes/app/+page.svelte`. Uses only `@facile/muse` components and `fc-*` tokens. Researches current client-portal practice (action-first, one primary call to action per row, clear status badges, plain amounts, mobile cards).

- Header with greeting and company name.
- Action required strip: invoices to pay (button to `/app/payment/[id]`) and documents to sign (button opening the Plume link).
- Four summary cards: billed, paid, remaining, overdue.
- Projects: one card per mission with price, paid progress bar, status, next due date, document count, signature badge.
- Documents: filterable list (type, project) with date, number, total, signature badge, Download, Sign.
- Payments: pending first, then paid with receipts, as today.
- Empty, loading and error states for each section. Responsive down to phone width. French and English strings through `@repo/i18n`, namespace `portal`.
- Nav label update in `+layout.svelte`.

### D. Web: admin manual data and import (`apps/web/src/routes/admin`)

- Documents: "Import existing document" flow (drag a PDF, form beside it with client, project, type, number, date, total, signature status, paid toggle). Document detail page: edit all fields, replace PDF, set signature manually or send to Plume, delete.
- Payments: create and edit a manual payment, mark paid or unpaid with date, delete.
- Missions, clients, providers: audit each detail page for missing edit or delete, add them, show why a delete is blocked.
- A short "bring your history" empty state on Documents pointing at the import flow.
- i18n namespace `import` and additions under existing admin keys.

## File ownership

| Agent | Owns |
|---|---|
| A | `packages/trpc/src/modules/{document,payment,mission,client,provider}`, `packages/plume` |
| B | `packages/trpc/src/modules/portal`, one line in `packages/trpc/src/index.ts` router wiring |
| C | `apps/web/src/routes/app/**`, `apps/web/src/lib/ui/**` for client components |
| D | `apps/web/src/routes/admin/**` |

`packages/i18n/src/locales/{en,fr}.ts` is shared: each agent adds its own namespace block and touches nothing else there.

## Integration and release

1. Lead runs `bunx prisma generate`, `mise run typecheck`, `mise run lint`, `filet check`.
2. Lead updates `CHANGELOG.md` (`Added`), `CLAUDE.md` (portal, import, sign link), `docs/`.
3. Ship with the `/ship` flow: PR so CI runs, bump to 0.7.0, tag, verify `/version`.
4. Wiki: update `projects/ardoise` with the portal contract, the `plumeClientSignUrl` trap and the import model.
