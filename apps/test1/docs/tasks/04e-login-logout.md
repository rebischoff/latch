# 04e — Login and logout UI

> **Status:** Complete (2026-06-03). Parent: [04-better-auth.md](./04-better-auth.md). **Before:** [04d-session-guards.md](./04d-session-guards.md). **Next:** [05-neon-migrations-skeleton.md](./05-neon-migrations-skeleton.md).

## Goal

Replace login placeholder with email/password form (RHF + Server Action), sign-out action, and post-login redirect. Completes parent task **04** user-visible flows.

## Prerequisites

- **04d** complete (guards + layout use real session).
- Dev env: `.env.local` with Better Auth vars from [../CONFIG.md](../CONFIG.md).

## Latch touchpoints

| Rule | Detail |
|------|--------|
| Client components | Must **not** import `@latch/dal` or call DAL |
| Server Actions | Orchestrate Better Auth sign-in/out only — no `db.*` |

`getPrincipal()` runs on server in layout, not in client login form.

## Files

| File | Action |
|------|--------|
| `apps/test1/src/app/login/page.tsx` | **Edit** — RHF form, email + password |
| `apps/test1/src/app/login/LoginPlaceholder.tsx` | **Delete** (or replace inline) |
| `apps/test1/src/app/actions/auth.ts` | **Create** — `signIn`, `signOut` Server Actions |
| `apps/test1/src/components/AppShell.tsx` | **Edit** (if needed) — wire logout control to action |

## Steps

1. Login form posts via Server Action → Better Auth sign-in API.
2. On success, `redirect` to `/contacts` or `(app)/` home (pick one and document in [../LAYOUT.md](../LAYOUT.md)).
3. Logout action → Better Auth sign-out → redirect `/login`.
4. Error states: invalid credentials message (no stack traces to client).
5. Parent **04** rollup: run full manual flow (login → app → logout → redirect).

## Verify (stop gate)

- [x] Login with dev user (**04b** temporary user or **05** seed when available)
- [x] Logout returns to `/login`; protected routes redirect when logged out
- [x] No `@latch/dal` in client components
- [x] [../STATUS.md](../STATUS.md) → **05-neon-migrations-skeleton.md**
- [x] Parent [04-better-auth.md](./04-better-auth.md) rollup checkboxes marked `[x]`

## Out of scope

- `latch_user_roles` DB load ( **05** )
- IAM pages
- OAuth provider implementation (CONFIG matrix only)
