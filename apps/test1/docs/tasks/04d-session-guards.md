# 04d — Session guards (protected layout)

> **Status:** Complete (2026-06-03). Parent: [04-better-auth.md](./04-better-auth.md). **Before:** [04c-principal-seam.md](./04c-principal-seam.md). **Next:** [04e-login-logout.md](./04e-login-logout.md).

## Goal

Gate the `(app)` route group: unauthenticated users redirect to `/login`; authenticated layout uses **real** `getPrincipal()` and session label (not task **03** placeholders).

## Prerequisites

- **04c** complete (`getPrincipal`, `readProviderSession`).

## Latch touchpoints

| Package | Usage |
|---------|--------|
| `@latch/contracts` | `Principal` via `getPrincipal()` → `resolveNavItems(principal)` |

Still no manifest / DAL.

## Files

| File | Action |
|------|--------|
| `apps/test1/src/lib/auth/requireSession.ts` | **Create** — redirect to `/login` when no session |
| `apps/test1/src/app/(app)/layout.tsx` | **Edit** — `requireSession()`; `getPrincipal()`; `readProviderSession()` |
| `apps/test1/src/lib/auth/placeholder-principal.ts` | **Delete** |
| `apps/test1/src/lib/auth/placeholder-session.ts` | **Delete** |

## Steps

1. `requireSession()` — call `readProviderSession()`; if null, `redirect("/login")`.
2. Update `(app)/layout.tsx`:
   - Await `requireSession()` (or equivalent) before rendering shell.
   - `const principal = await getPrincipal()` for nav (empty catalog OK).
   - `userLabel` from session label.
3. Remove placeholder imports and delete placeholder modules.
4. Confirm **public** routes stay outside `(app)` (e.g. `/login`).

## Verify (stop gate)

- [x] Visiting `(app)/` while logged out redirects to `/login`
- [x] With valid session (manual sign-in from **04b** config or after **04e**), shell renders with real user label
- [x] Placeholder auth files removed
- [x] `resolveNavItems(principal)` still type-checks with empty nav

## Out of scope

- Polished login form ( **04e** )
- Logout action ( **04e** )
- Full login E2E with seed users ( **05** if seed required)
