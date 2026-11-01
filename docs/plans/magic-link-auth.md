# Plan: magic link sign-in for clients

Status: draft, 2026-11-01. Nothing implemented.

## Decisions

| Question | Decision |
|---|---|
| Client passwords | Dropped outright. `User.password` becomes nullable. `auth.login` refuses CLIENT users. |
| Where the logic lives | A new TS package (own repo) and a Go package in porte. Ardoise consumes the TS one. |
| Lifetimes | Link: 15 minutes. Session: 7 days (the current refresh cookie lifetime). |
| Existing clients | Passwords nulled silently by the migration. No notice mail. |
| Browser binding | None. The link works on any device. Scanner safety comes from a confirm-button page and a POST consume. |
| Client invitations | Removed. An admin creates the client, and the welcome mail carries a magic link. Staff and space-member invitations stay. |

## Goals and non-goals

Goals:

- Clients sign in with an email and a one-time link. No password exists for them.
- Admins keep password and OIDC sign-in, unchanged.
- One tested implementation of the hard parts (token handling, single use, timing, enumeration) that Ardoise and the Go apps share in behaviour.

Non-goals:

- Magic links for staff or admins.
- Rewriting Ardoise's session system (JWT access token plus rotating refresh token in `Session`). The link only replaces the password check in front of `issueSession`.
- Moving Go apps onto the new porte package. That is a separate adoption per app.

## Contract shared by both implementations

Both packages implement the same behaviour, so the Go and TS versions can be reviewed against one spec.

1. **Token**: 32 random bytes, hex encoded. Only the sha256 hash is stored. The raw token appears once, in the email.
2. **Lifetime**: configurable, default 15 minutes.
3. **Single use**: consumption is one atomic conditional update (`consumed_at IS NULL AND expires_at > now`). A second consume of the same token fails.
4. **Supersession**: requesting a new link invalidates the user's older unconsumed links.
5. **No enumeration**: `request` returns the same result and takes about the same time for a known and an unknown email. Mail goes out only for an eligible user.
6. **Eligibility is the app's call**: the package asks the app for the user by email. The app decides who may receive a link (Ardoise: active CLIENT users only).
7. **Rate limit**: per email and per source IP, enforced by the package through a store count, with the limits in config. Defaults: 5 requests per email per hour, 20 per IP per hour.
8. **Consume is POST only**. The package never logs a user in on GET. Email scanners prefetch links; a GET that signs in would burn the token before the client clicks.
9. **After consume**: the package hands the user id back to the app, which issues its own session. The package never mints sessions itself in TS. In Go it can, through `session.Manager`.
10. **Errors are uniform**: unknown, expired, consumed and superseded tokens all return the same `invalid_or_expired` error.

## Part 1: new TS package

### Repo and naming

- New repo `FacileStudio/magiclink`, package `@facile/magiclink` (name confirmed). The porte SPEC marks the TS siblings as out of scope for the Go repo, hence the separate repo.
- Layout copies `facteur-ts`: `src/`, `tsconfig.json`, `package.json` with `type: module`, `filet.yml`, `lefthook.yml`, `mise.toml`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`.
- Distribution matches how Ardoise already consumes `@facile/muse`: a git tag dependency in `package.json` (`github:FacileStudio/magiclink#v0.1.0`). No npm publish needed.
- Runtime dependencies: none. It uses `node:crypto` only. Bun and Node both run it.

### API sketch

```ts
export interface MagicLinkStore {
  create(link: { userId: string; tokenHash: string; expiresAt: Date; ip?: string }): Promise<void>;
  invalidateForUser(userId: string): Promise<void>;
  consume(tokenHash: string, now: Date): Promise<{ userId: string } | null>;
  countSince(key: { userId?: string; ip?: string }, since: Date): Promise<number>;
}

export interface MagicLinkDeps {
  store: MagicLinkStore;
  findUserByEmail(email: string): Promise<{ id: string; email: string } | null>;
  send(to: string, link: string): Promise<void>;
  buildLink(token: string): string;
  clock?: () => Date;
}

export function createMagicLinks(config: MagicLinkConfig, deps: MagicLinkDeps): {
  request(email: string, meta?: { ip?: string }): Promise<void>;
  consume(token: string): Promise<{ userId: string }>;
};
```

Notes:

- `consume` in the store is the atomic step. The package never reads then writes.
- The package normalises email (trim, lowercase) before `findUserByEmail`.
- An in-memory `MagicLinkStore` ships in the package for tests, like `facteur-ts` ships an in-memory mailer.
- The package does not know about Prisma, tRPC, Hono or SMTP. Ardoise writes a 30 line Prisma store.

### Tests (bun test, no fixtures)

- Valid token consumes once; second consume fails.
- Expired token fails.
- Unknown token fails with the same error as an expired one.
- New request supersedes the old link.
- Unknown email: no mail sent, same return value, no throw.
- Rate limit trips after the configured count.
- Concurrent double consume: exactly one succeeds (in-memory store must model the atomic step).

### Release

- v0.1.0 tag after the tests pass and `filet check` is clean.
- Wiki page in `projects/magiclink.md` after the first release (the contract above, the repo name, how Ardoise pins it).

## Part 2: Go package in porte

Read `porte/SPEC.md` first. It carries the decisions and the contract, and the plan below must be checked against it before any code is written.

### Shape

- New package `porte/magiclink`, sibling of `porte/local`. It depends on `porte/session`, not on `porte/oidc`, for the same reason `porte/local` does: an app that wants only magic links must not compile an OIDC client.
- The contract package `porte` gains the store interface and the error values. It stays standard-library only.
- IDs are `int64` in porte, so the Go contract uses `int64` where TS uses `string`. Behaviour is otherwise the same list as above.

```go
type Store interface {
    Create(ctx context.Context, userID int64, tokenHash []byte, expiresAt time.Time, ip string) error
    InvalidateForUser(ctx context.Context, userID int64) error
    Consume(ctx context.Context, tokenHash []byte, now time.Time) (userID int64, err error)
    CountSince(ctx context.Context, userID int64, ip string, since time.Time) (int, error)
}
```

(Final signatures follow the conventions in `porte.go`, `token.go` and the existing stores. This block is the intent, not the code.)

### Pieces

- `magiclink/magiclink.go`: `Kit`, `Config`, `Deps` (users lookup, mailer func, link builder, `*session.Manager`, logger), `Request`, `Consume`.
- Routes mounted on a chi router, the way `local` does it: `POST /auth/magic-link` (request) and `POST /auth/magic-link/consume`. On consume success it calls `Sessions.IssueCookie`, so a magic link login lands in the same session, cookie and logout as every other porte login.
- `porte/pg`: a `magic_links` table and a `MagicLinks()` store, with a migration. The consume is a single `UPDATE ... WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > $2 RETURNING user_id`.
- Timing: the unknown-email path does the same work as the known path (a token is generated and hashed, nothing is stored or sent), the way `local` equalises timing for an unknown address.
- Tests mirror `local_test.go` (it already mentions magic links in some form, check what before reusing). Add a conformance function the TS store tests can be compared against.
- Docs: README package table row, SPEC section, CHANGELOG entry, version bump per the porte release process.

### Verified before starting

`porte/local/local_test.go` has no magic link code, so nothing partial exists to extend. The porte working tree has uncommitted edits to `avatarfs/avatarfs.go` and `local/local.go` and is one commit ahead of origin. Work in a git worktree and leave those edits alone.

## Part 3: Ardoise changes

Order matters. Each step leaves the repo green (typecheck, lint, tests, `filet check`).

### Step 1: schema and migration

- `packages/database/prisma/schema/magic-link.prisma`:

  ```prisma
  model MagicLink {
    id         String    @id @default(uuid())
    userId     String
    tokenHash  String    @unique
    expiresAt  DateTime
    consumedAt DateTime?
    ipAddress  String?
    createdAt  DateTime  @default(now())

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId, createdAt])
    @@index([ipAddress, createdAt])
  }
  ```

- Add `magicLinks MagicLink[]` to `User`.
- `User.password` becomes `String?`.
- Migration also runs `UPDATE "User" SET password = NULL WHERE role = 'CLIENT'`. Silent, as decided.
- Fix every reader of `user.password` for the nullable type. The files that mention passwords today: `auth/service.ts`, `auth/service.test.ts`, `auth/login-gate.test.ts`, `user/service.ts`, `client/service.ts`, `client/types.ts`, `invitation/service.ts`, `invitation/types.ts`, `invitation/sso-only.test.ts`, `admin/service.ts`, `payment/service.ts`, `apps/backend/src/lib/bootstrap.ts` and its test, `exposure.test.ts`, `no-secrets.test.ts`. Checked: `payment/service.ts` does not touch user passwords. `client/service.ts` has a `credentialPassword` path (an optional password for a user created with a client), which must be removed or limited to non-CLIENT users. `user/service.ts` has `create`, `update` and `changePassword`, all of which read or write `password`.
- Regenerate the Prisma client and `packages/database/src/zod` (see wiki `projects/ardoise`: `bunx prisma generate`, then `scripts/patch-zod-types.ts`).
- Keep `no-secrets.test.ts` and `exposure.test.ts` passing: `MagicLink.tokenHash` must never reach a client response.

### Step 2: add the dependency and the store

- Add `@facile/magiclink` to the package that will host the module (`packages/trpc/package.json`) as a git tag dependency.
- Regenerate `bun.lock` with bun 1.3.7 (wiki: a newer local bun writes lockfileVersion 3 and CI fails at Install). Check that line 2 of `bun.lock` says 1.
- New `packages/trpc/src/modules/magic-link/store.ts`: the Prisma `MagicLinkStore`. `consume` uses `updateMany({ where: { tokenHash, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } })`, then reads the user id when `count === 1`.

### Step 3: module and routes

- `packages/trpc/src/modules/magic-link/{router.ts,service.ts}`, in the style of the other modules.
- `magicLink.request` (publicProcedure): input `{ email }`. Always returns `{ ok: true }`.
- `magicLink.consume` (publicProcedure mutation): input `{ token }`. After the package returns the user id it loads the session user, runs `loginBlockReason`, then `issueSession` and sets the auth cookies exactly as `auth.login` does. Reuse `auth/session.ts` helpers. Do not copy them.
- `findUserByEmail` returns only users with `role = 'CLIENT'`, `status = 'ACTIVE'`, not banned or suspended. Anything else behaves like an unknown email.
- `buildLink` returns `${FRONTEND_URL}/login/verify?token=<token>`.
- `send` uses `EmailTemplates` from `@repo/smtp` with a new `sendMagicLink` template. Add the template beside `sendInvitation` in `packages/smtp/src/templates.ts`, in en and fr if the existing templates are bilingual (check).
- Register the router in the root router. Update `exposure.test.ts` expectations for the two new public procedures.
- IP comes from the same place `auth.login` takes `SessionMeta`.

### Step 4: close the password path for clients

- `auth.login`: refuse CLIENT users. Reuse the structure that `ssoOnly` uses for non-CLIENT users today: same `Invalid credentials` message, same decoy hash work. The existing gate becomes: refuse CLIENT always, refuse non-CLIENT when `SSO_ONLY`.
- `auth.refresh` stays unchanged. Sessions issued by a magic link refresh like any other.
- `client/service.ts` and `client/types.ts`: client creation takes no password. After creating the user, send the welcome mail with a first magic link (call the same `request` path, bypassing the rate limit for the admin action but not for the public endpoint).
- `user/service.ts`: password set or reset flows reject CLIENT users.
- `invitation`: `create` and `accept` refuse `role: 'CLIENT'` with a clear message, including space-member invitations for an email with no account. An admin creates the client first, then adds them to the space. Staff invitations keep their password step.
- `bootstrap.ts`: no change expected. The admin is not a CLIENT.

### Step 5: web

- `apps/web/src/routes/login/+page.svelte`: add a client form (email only, "send me a link") and a "check your inbox" state. Admin and staff keep their existing form and SSO button. Use `@facile/muse` components and the `fc-*` tokens (see CLAUDE.md gotchas), never raw Tailwind palette classes.
- New `apps/web/src/routes/login/verify/+page.svelte`: reads `token` from the URL, shows one "Sign in" button, and calls `magicLink.consume` on click. On success it redirects to `/app`. On failure it shows the uniform error and a link back to `/login`.
- Remove password fields for clients in `admin/clients/create/+page.svelte`, and in `ProfileSection.svelte` when the user is a CLIENT. Do not remove them for admins.
- Remove the password step from `invite/[token]/+page.svelte` for the client path. Keep it for staff invitations.
- `apps/web/src/lib/auth-config.ts` and `GET /auth/config`: add a `client_magic_link: true` flag so the UI does not hard-code the mode.
- i18n: add the new strings to `packages/i18n/src/locales/en.ts` and `fr.ts` together. The i18n system is type-safe, so a missing key fails typecheck.

### Step 6: tests

The TS package carries the contract tests. Ardoise adds only integration checks:

- A CLIENT can request, consume, and then call a protected procedure.
- A CLIENT cannot log in with a password, including a leftover non-null password hash.
- Banned and suspended clients get no mail and cannot consume an already issued link.
- Admins cannot receive a link (treated as unknown email).
- `auth.login` timing path for CLIENT matches the wrong-password path (extend `login-gate.test.ts`).
- Token hash never appears in any router output (`no-secrets.test.ts`).

### Step 7: docs and release

- `docs/architecture.md`: add a "Client sign-in" section. `docs/api.md`: the two procedures. `docs/configuration.md`: any new env vars (see below).
- `CLAUDE.md`: update the Authentication and SSO-only sections, since "Always use `AuthManager.hashPassword()` when creating users" now has an exception for clients.
- `CHANGELOG.md` under `## [Unreleased]`: breaking change, so a minor bump on 0.x.
- Release follows the fixed order from the wiki: set `APP_VERSION` in the Dokploy compose env first, push `main`, verify the remote head with `git ls-remote`, then tag. Chain with `&&` and never end a chain with a pipe to `tail`.

## Configuration

Proposed env vars. Keep them few, and give them defaults so a deploy needs no change.

| Variable | Default | Meaning |
|---|---|---|
| `MAGIC_LINK_TTL_MINUTES` | `15` | Link lifetime |
| `MAGIC_LINK_MAX_PER_EMAIL_HOUR` | `5` | Request cap per email |
| `MAGIC_LINK_MAX_PER_IP_HOUR` | `20` | Request cap per IP |

Add them to `packages/env/src/index.ts` with Zod defaults and to `docs/configuration.md`. The session length stays at the existing 7 days.

## Security notes

- Link in email is a bearer credential for 15 minutes. HTTPS is required in production. The link points at the web app, never the API.
- The verify page must send `Referrer-Policy: no-referrer` and must not load third-party resources, so the token cannot leak in a Referer header. Strip the token from the address bar after reading it (`history.replaceState`).
- No browser binding means a forwarded email grants access. Accepted trade-off, decided above. The mitigation is the short TTL and single use.
- Rate limits apply to the public `request` endpoint only. The admin-created welcome link is not counted against the client.
- Log the request and consume events (user id, IP, outcome) through `@repo/logger`. Never log the raw token.
- Suspending or banning a client must keep working: `consume` runs `loginBlockReason` after the token check, and `RevokeUser`-style session deletion still happens in the existing admin actions.

## Sequence and sizing

1. Part 1 (TS package) and Part 2 (porte) are independent. They can be built in parallel in separate worktrees, since they share only the written contract above.
2. Part 3 depends on Part 1 being tagged. Until then, Ardoise can develop against a local path dependency.
3. Part 3 is one PR on a branch off `origin/main` (run `git fetch` first, per the wiki note about a stale checkout).

## Resolved questions

1. Name: `magiclink` (one word, everywhere for the package, repo and Go package). Repo `FacileStudio/magiclink`, package `@facile/magiclink`, Go package `porte/magiclink`.
2. Space invitations never create clients. An admin creates the client first, then adds them to a space. Invitations for new CLIENT users are refused.
3. "Sign out of all devices" for clients: out of scope.
4. Welcome mail wording: reuse the invitation template style from `packages/smtp/src/templates.ts`. No decision needed.

## Wiki follow-up (end gate)

When the work lands, file in `~/.mycelium/memory/`:

- `projects/magiclink.md`: contract, repo, tag, how Ardoise pins it.
- Update `projects/ardoise.md`: clients have no password, `User.password` nullable, the CLIENT refusal in `auth.login`.
- Update `projects/porte.md` if it exists: the new `magiclink` package.
