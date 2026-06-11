# 15 — CRM session migration (provider login)

> **Status:** Complete (2026-06-02). Next: [20-e2e-identity.md](./20-e2e-identity.md).

## Goal

CRM login/logout uses Auth.js; remove hand-rolled cookie role embedding; prove different logins → different manifests via **DB roles** only.

## Prerequisites

[14-auth-provider.md](./14-auth-provider.md) complete.
[05-principal-db-roles.md](./05-principal-db-roles.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/app/login/page.tsx` + `LoginForm.tsx` | Redirect to provider sign-in or embed provider UI |
| `apps/crm/src/app/login/actions.ts` | Remove / replace dev-only `loginAction` |
| `apps/crm/src/app/actions/auth.ts` | `logoutAction` → provider signOut |
| `apps/crm/src/lib/auth/getPrincipal.ts` | Provider session first; stub for tests |
| `apps/crm/src/lib/auth/session.ts` + `requireSession.ts` | Align with provider session; delete duplicate cookie format |
| [`../../../../apps/crm/docs/AUTH.md`](../../../../../apps/crm/docs/AUTH.md) | v1 section updated |

## Steps

1. Replace custom `latch_session` JSON cookie with the provider session (or a thin wrapper storing only the session token / `userId`).
2. **Log out** — provider signOut from `actions/auth.ts`.
3. `(app)/layout.tsx` `requireSession()` behavior unchanged (still redirects when unauthenticated).
4. Manual QA: login as tech → jobs nav only; login as admin → customers + financial fields — **driven by DB roles from task 05**, not the cookie.
5. Document: preview may keep Credentials; production must not use `CRM_DEV_PASSWORD`.

## Verify (stop gate)

- [x] Login as `tech@demo.local` → `Principal.roles` from DB is `['field_tech']`
- [x] Login as `admin@demo.local` → `['office_admin']`
- [x] No `roles` array stored in client-accessible session payload
- [x] `npm run test` still green (stub path for CI)
- [x] [`../STATUS.md`](../STATUS.md) → **20-e2e-identity.md**

## Out of scope

IAM admin CRM pages
OAuth provider production credentials (document only)
