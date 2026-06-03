# 05 — Principal loads roles from DB

> **Status:** Complete (2026-06-02). Next: [06-surface-yaml.md](./06-surface-yaml.md).

## Goal

`getPrincipal()` returns `Principal.roles` from `latch_user_roles` (store/DB), not from the session cookie or a single env role. Session and stub paths supply **user id only**; authorization input is always DB-backed in non-test flows.

## Prerequisites

[04-db-schema.md](./04-db-schema.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/src/lib/iam/load-roles.ts` | **Create** — `loadRolesForUser(userId): Promise<string[]>` |
| `apps/crm/src/lib/auth/getPrincipal.ts` | Session → `id` + `loadRolesForUser`; stub unchanged for CI |
| `apps/crm/src/lib/auth/session.ts` | Narrow `SessionPayload` to `{ userId, label }` — drop `roles` from the cookie + `isSessionPayload` guard |
| `apps/crm/src/app/login/actions.ts` | `loginAction` stops writing `roles` into the cookie |
| `apps/crm/src/lib/auth/users.ts` | `CrmUser.roles` no longer authoritative — keep for seed mapping only or drop |
| `apps/crm/src/lib/auth/requireSession.ts` | Returns narrowed `SessionPayload`; callers must not read `roles` |
| `packages/contracts` | Confirm `Principal` type unchanged (`RoleId = string`) |

## Steps

1. **`loadRolesForUser`** — read from `MemoryJobStore` / store facade (`latch_user_roles`); empty → `[]` (caller treats as no grants).
2. **`getPrincipal`** order (currently returns `session.roles` directly — replace):
   - Session cookie with `userId` → `{ id, roles: await loadRolesForUser(userId) }`
   - Else `LATCH_STUB_USER` + `LATCH_STUB_ROLE` → single-role stub **or** load DB roles when stub user exists in seed (document choice in code comment)
   - Else throw (unchanged)
3. **`resolveContext`** / `PolicyService` — no changes required if `Principal.roles` is populated correctly.
4. Update callers that read `session.roles` (none should remain after narrowing) and any `nav.ts` / `latch.ts` assumptions.
5. Add unit test: user with two seeded roles in `latch_user_roles` → `union_grants` manifest wider than either role alone.

## Verify (stop gate)

- [x] `npm run test` — new load-roles test green
- [x] `npm run build` passes
- [x] With session as admin, `getPrincipal().roles` is `['office_admin']` from DB, not cookie
- [x] `LATCH_STUB_USER` + `LATCH_STUB_ROLE` still works for existing threat/e2e when no cookie
- [x] [`../STATUS.md`](../STATUS.md) → **06-surface-yaml.md**

## Out of scope

- Auth.js (task **14**)
- IAM Surface DAL (tasks **09–10**)
- Removing dev login page (task **15**)
