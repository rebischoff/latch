# 03 — `@latch/pg-session`

> **Status:** Complete (2026-06-11). Next: [04-adapter-neon.md](./04-adapter-neon.md).

## Goal

Extract the shared Postgres session binding (`withPermissionDb` / `bindPermissionSession`, `SET LOCAL` T12 envelope) out of `@latch/audit` into `@latch/pg-session`. `@latch/audit` re-exports during a deprecation window. (Slice 9.2; satisfies the [2026-06-04 trigger](../../../reference/packages.md#decision-extract-latchpg-session-when-postgres-surface-grows-2026-06-04), now met per scope.md.)

## Files

| File | Action |
|------|--------|
| `packages/pg-session/` (new) | `@latch/pg-session`; `pg` only — no `dal`/`audit`/`policy` deps. Exports `withPermissionDb`, `bindPermissionSession`, `LATCH_DEFAULT_COMPANY_ID` |
| `packages/audit/src/permission-db.ts` | Remove implementation; re-export from `@latch/pg-session` (deprecation note) |
| `packages/adapter-pg-audit` | Switch import → `@latch/pg-session` |
| consumers (`dal`, `approval`, IAM paths) | Import `@latch/pg-session` (or via audit re-export) |
| `packages/pg-session/src/*.test.ts` | Move/copy T12 + permission-db tests |

## Verify (stop gate)

- [x] `@latch/pg-session` builds; depends only on `pg` + `@latch/contracts`.
- [x] No `withPermissionDb` **implementation** left in `@latch/audit` (re-export only).
- [x] `@latch/adapter-pg-audit` imports from `@latch/pg-session`.
- [x] T12 / permission-db tests pass from the new package.
- [x] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `04-adapter-neon.md`.

## Out of scope

- Pooled connection factory / dual URL (task 04), Drizzle helpers (task 08).
