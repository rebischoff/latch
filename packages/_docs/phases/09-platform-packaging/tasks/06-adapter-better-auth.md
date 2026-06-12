# 06 — `@latch/adapter-better-auth`

> **Status:** Complete (2026-06-11). Next: [07-app-kit.md](./07-app-kit.md).

## Goal

Identity adapter: Better Auth (session/JWT-only, no own user table) → `getPrincipal()` mapping provider subject → `latch_users.id`; roles load from the DB. (Slice 9.5; [02-identity F](../../../discussions/02-identity-and-permissions.md).)

## Files

| File | Action |
|------|--------|
| `packages/adapter-better-auth/` (new) | `@latch/adapter-better-auth`; `createGetPrincipal(...)` → `Principal` (id + DB roles + scope bindings) |
| `packages/codegen/template/lib/latch.ts` | Wire the adapter into the `getPrincipal` seam |
| `packages/adapter-better-auth/src/*.test.ts` | Subject→`latch_users.id` mapping; roles from `latch_user_roles`, not cookie |

## Verify (stop gate)

- [x] `@latch/adapter-better-auth` builds; maps subject → `latch_users.id`.
- [x] `getPrincipal` returns DB-backed `Principal` (roles/scopes from DB).
- [x] No second user table; Better Auth runs session/JWT-only.
- [x] Template `lib/latch.ts` wires the adapter.
- [x] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `07-app-kit.md`.

## Out of scope

- Login UI / OAuth provider config; `resolveContext` orchestration (task 07).
