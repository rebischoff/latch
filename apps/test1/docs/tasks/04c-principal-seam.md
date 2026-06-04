# 04c — Principal seam (`getPrincipal`)

> **Status:** Complete (2026-06-03). Parent: [04-better-auth.md](./04-better-auth.md). **Before:** [04b-better-auth-server.md](./04b-better-auth-server.md). **Next:** [04d-session-guards.md](./04d-session-guards.md).

## Goal

Implement the **Latch auth seam**: map Better Auth session → `{ userId, label }`, then `getPrincipal()` → `@latch/contracts` `Principal` with **`roles: []`** until task **05** loads roles from DB.

## Prerequisites

- **04b** complete (Better Auth server responds).
- [04a-latch-auth-boundary.md](./04a-latch-auth-boundary.md) understood.

## Latch touchpoints

| Package | Usage |
|---------|--------|
| `@latch/contracts` | `import type { Principal } from "@latch/contracts"` — return type only |

Do **not** call `PolicyService` or DAL here.

## Files

| File | Action |
|------|--------|
| `apps/test1/src/lib/auth/provider-session.ts` | **Create** — `readProviderSession()` → `{ userId, label } \| null` |
| `apps/test1/src/lib/auth/getPrincipal.ts` | **Create** — mirror CRM shape; stub `roles: []` when session present |
| `apps/test1/src/lib/auth/getPrincipal.test.ts` | **Create** (recommended) — `LATCH_STUB_USER` + `LATCH_STUB_ROLE` path |

Reference: [`apps/crm/src/lib/auth/getPrincipal.ts`](../../../crm/src/lib/auth/getPrincipal.ts).

## Steps

1. `readProviderSession()` — read Better Auth session; extract **id** and display **label** only.
2. `getPrincipal()`:
   - Session present → `{ id: session.userId, roles: [] }` (no `policyVersion` until **05**).
   - No session → if `LATCH_STUB_USER` and `LATCH_STUB_ROLE` set, return `{ id, roles: [stubRole] }`.
   - Otherwise → throw `"No session"` (same message family as CRM for test parity).
3. **Do not** read roles from Better Auth session or plugins.
4. Optional: unit test stub path without HTTP.

## Verify (stop gate)

- [x] `getPrincipal()` return type is `Principal` from `@latch/contracts`
- [x] Logged-in session yields `roles: []` (not undefined keys from session)
- [x] Stub env test passes when implemented
- [x] No `@latch/dal` import in auth modules
- [x] Layout may still use placeholders until **04d** — OK for this gate

## Out of scope

- `requireSession` / layout swap ( **04d** )
- `loadRolesForUser` from DB ( **05** )
- `policyVersion` from DB ( **05** / **90** )
