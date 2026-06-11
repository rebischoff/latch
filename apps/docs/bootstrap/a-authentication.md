# Bootstrap a — Authentication

> **Status:** Proposal (2026-06-10). General plan for scaffolded temp apps. App-specific credentials and env names → `apps/<slug>/docs/`.

## Goal

Replace dev-only “Act as” (spike pattern) with **real login** so `Principal.id` matches `latch_users.id` and roles load from `latch_user_roles`.

### Decision: Auth.js v5 + Credentials (dev) (2026-06-02, reaffirmed 2026-06-10)

**Choice:** [Auth.js](https://authjs.dev/) (`next-auth@beta`) in the temp app. Session carries **user id only**; roles always from DB on each request.

**Rationale:** Locked in Phase 03. External OAuth/OIDC per deployment later; Credentials sufficient for internal temp apps and CI stubs.

---

## Files to add (per app)

| Path | Purpose |
|------|---------|
| `app/api/auth/[...nextauth]/route.ts` | Auth.js handler |
| `app/login/page.tsx` | Credentials form |
| `lib/auth/config.ts` | Providers, callbacks, `auth()` export |
| `lib/auth/get-principal.ts` | `auth()` → `loadPrincipalFromDb(pool, userId)` |
| `.env.example` | `AUTH_SECRET`, `DATABASE_URL` |

Reuse SQL from `spike_policy/lib/request-policy.ts` (`loadPrincipalFromDb`) — copy into app `lib/` or later `@latch/app-kit`.

---

## Credentials provider (dev)

1. `authorize(credentials)` looks up `latch_users` by id or email column (app choice — document in app docs).
2. Dev-only: compare password to env `LATCH_DEV_PASSWORD` or per-user hash in fixture migration.
3. Return `{ id: user.id, name: user.display_name }`.
4. **Do not** embed roles in the JWT/session.

**Bootstrap admin:** fixture user `bootstrap-admin` (has `system_iam` + `system_data`) must be login-capable for break-glass.

---

## Middleware (optional v1)

- Protect `/(app)/**` routes; allow `/login`, `/api/auth/**`.
- Or check session in each layout — middleware is nicer UX.

---

## Verify

- [ ] Unauthenticated visit to `/widgets` redirects to `/login`
- [ ] Login as `viewer@demo` → session `userId` matches `latch_users.id`
- [ ] `getPrincipal()` returns DB bindings (not cookie roles)
- [ ] Logout clears session
- [ ] No `act-as` cookie path in temp app

---

## Related

- [b — Authorization](./b-authorization.md)
- Phase 03 [`decisions.md`](../../../packages/docs/phases/03-identity-iam/decisions.md)
- `spike_policy` open-items — real login deferred there intentionally
