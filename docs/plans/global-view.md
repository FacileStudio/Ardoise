# Plan: one global view instead of a space switcher

Status: approved by the owner, 2026-11-03. Target release v0.12.0.

## Goal

Staff see every client, provider, mission, document and payment they can reach in one table, filtered by space, instead of switching spaces to see one client at a time.

## Why

The team runs one space per client (mirrored from Registre). The admin layout holds one active space in `localStorage` (`apps/web/src/lib/space-context.svelte.ts`), and every list sends it as `spaceId`, so no screen shows more than one client. Production on 2026-11-03: 9 spaces, 4 clients, each client alone in its space, and 0 rows without a space.

## Decisions

| Question | Decision |
|---|---|
| What a space is | The access boundary, still mirrored from Registre. A staff member sees the rows of the spaces they belong to. |
| UI | No switcher. Every list shows all reachable rows, a Space column, and a space filter that defaults to "Tous les espaces". |
| Rows without a space | Gone. `spaceId` becomes required on Client, Mission, Document and Payment. The migration aborts if a null remains. |
| Space of a new record | Only a new client picks a space. Missions, documents and payments take the space of their client. |
| Providers | Global: one row per person or company, usable in every space. Duplicates are merged. |

## API contract

- `resolveScope(db, userId, spaceId?)`: no `spaceId` now means "every space I belong to" (`type: 'spaces'`), not personal scope. `scopeWhere` gives `{ spaceId: { in: [...] } }`. A caller in no space gets an empty list, never every row.
- `resolveTargetSpace(db, userId, spaceId)`: a single space the caller belongs to, for writes. `client.create` and `client.transfer` require `spaceId`.
- Missions, documents (generated and imported) and payments read the space from the client row they were loaded with, never from the request.
- `provider.*` drops `spaceId`. Providers are visible to all staff, like the rest of the admin.
- List rows include `space: { id, name }` so the table can show the column.

## Data migration (`20261103200000_global_view`)

1. Merge providers by `lower(trim(email))`. The survivor is the row with the most references (documents, mission links, prestations), then the newest. Empty survivor fields are filled from the duplicates. `Document.providerId` and `Prestation.providerId` move to the survivor. Mission links move too, except where the mission already links the survivor; those duplicate links are dropped. Documents keep their own provider snapshot (`providerName`, `providerSiret`), so issued PDFs do not change.
2. Drop `Provider.spaceId`.
3. Abort if any Client, Mission, Document or Payment has a null `spaceId`. Then set the four columns `NOT NULL` with `ON DELETE RESTRICT` (`space.delete` already refuses a space that holds data).

Result on prod (2026-11-03): 12 providers became 5 (Camille Bonnet-Crevel, Kaktuse, Mohamed Mazouz, Noah Steiniger, Yann Thevenin). The survivors kept the `...00022` SIRETs, which the newest invoices (June to October 2026) also carry; `...00014` only appears on older documents.

## Steps

1. `packages/database/prisma/schema/{provider,client,mission,document,payment}.prisma` plus the migration above.
2. `packages/trpc/src/modules/space/service.ts`: multi-space scope, `resolveTargetSpace`, drop personal scope; update `scope.test.ts`.
3. `client`, `mission`, `document` (`service.ts`, `router.ts`, `manual.ts`), `payment`, `provider`, `media`: writes take the client's space, lists include `space`.
4. `apps/web`: delete `space-context.svelte.ts` and the switcher; add `space-filter.svelte.ts` and a `SpaceFilter` dropdown on each list; Space column; space select on client create only.
5. Gate: `filet check`, typecheck, lint, `bun test` in `packages/trpc` and `apps/backend`.
6. Rehearse the migration on a copy of the prod database, then release.

## Skip

- A UI to merge providers by hand: the migration does the one-time merge and the edit form fixes fields.
- Per-space document numbering changes: numbers stay unique per space, and the Space column tells them apart.
- Cross-space statistics breakdowns beyond the filter.
