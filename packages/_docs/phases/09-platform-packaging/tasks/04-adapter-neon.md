# 04 — `@latch/adapter-neon`

> **Status:** Complete (2026-06-11). Next: [05-audit-mode.md](./05-audit-mode.md).

## Goal

Hosting adapter (not spine): dual connection URLs over the **standard `pg` driver**. (Slice 9.3.) **Must not** import `@neondatabase/serverless` or use the Neon branch API — both stay Phase 07 ([scope.md](../../../foundations/scope.md#decision-neon-hosting-adapter--standard-pg-dual-url-2026-06-11)).

## Prerequisites

- [`../decisions.md`](../decisions.md) `DatabaseConnections` type-home open item locked (default: `@latch/pg-session`).

## Files

| File | Action |
|------|--------|
| `packages/adapter-neon/` (new) | `@latch/adapter-neon`; `createDatabaseConnections()` reads `DATABASE_URL` (pooled runtime), `DATABASE_URL_DIRECT` (migrate/psql), `LATCH_APP_ROLE_PASSWORD`; returns `{ pool, directPool }` |
| `DatabaseConnections` type | In `@latch/pg-session` (or contracts per locked decision) |
| `packages/codegen/template/.env.example` | Document the three env vars + pooled-vs-direct usage |
| `packages/adapter-neon/src/*.test.ts` | Env parsing; pooled vs direct selection |

## Verify (stop gate)

- [x] `@latch/adapter-neon` builds; **no** `@neondatabase/serverless` dep; standard `pg` only.
- [x] `createDatabaseConnections()` returns pooled + direct pools from env.
- [x] No Neon imports in spine packages or (future) `@latch/app-kit`.
- [x] Template `.env.example` documents dual URL + role password.
- [x] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `05-audit-mode.md`.

## Out of scope

- App-kit injection of connections (task 07); Neon branch provisioning (Phase 07).
