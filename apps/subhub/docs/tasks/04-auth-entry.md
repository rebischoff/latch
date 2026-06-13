# 04 — Auth entry

## Goal

Login via header modal and `/login` inline form; shell nav remains visible on gate page.

## Prerequisites

[03-app-shell-layout.md](./03-app-shell-layout.md) complete. Better Auth wired (`app/api/auth/[...all]/route.ts`, `.env.local`).

## Files

| File | Action |
|------|--------|
| `app/(app)/login/page.tsx` | **Create** — inline login inside shell |
| `components/shell/LoginModal.tsx` | **Create** — modal trigger from header |
| `components/shell/UserMenu.tsx` | **Create** — login / logout / session display |
| `(app)/layout.tsx` | Redirect unauthenticated users to `/login` (except `/login` itself) |

## Steps

1. Use Better Auth client APIs for email/password (or stub) sign-in.
2. Modal: open from header when logged out; close on success + refresh session.
3. `/login`: same form inline; redirect to previous path or `/contacts` after login.
4. Server session check in `(app)/layout.tsx` via `getPrincipal` / session reader.

## Verify (stop gate)

- [ ] `curl` auth session endpoint returns 200/401 (not 500)
- [ ] Unauthenticated visit to `(app)` route redirects to `/login`
- [ ] Login modal and `/login` both establish session
- [ ] [`../../STATUS.md`](../../STATUS.md) → [05-nav-manifest.md](./05-nav-manifest.md)

## Out of scope

- IAM pages, business routes
