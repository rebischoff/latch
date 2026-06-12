# 02 — `@latch/adapter-pg-audit`

> **Status:** Complete (2026-06-11). Next: [03-pg-session.md](./03-pg-session.md).

## Goal

Extract the duplicated `createPostgresAuditWriter` into `@latch/adapter-pg-audit`. The template imports the package; copied `audit-db-writer.ts` files are deleted. (Slice 9.1.)

## Files

| File | Action |
|------|--------|
| `packages/adapter-pg-audit/` (new) | `@latch/adapter-pg-audit`; exports `createPostgresAuditWriter` (append-only INSERT → `latch_audit`, wrapped in `withPermissionDb`) |
| `packages/codegen/template/lib/audit-db-writer.ts` | Delete; template imports `@latch/adapter-pg-audit` |
| `packages/adapter-pg-audit/src/*.test.ts` (new) | INSERT shape + actor binding coverage |

## Notes

- May import `withPermissionDb` from `@latch/audit` **until task 03** moves it to `@latch/pg-session`.
- Keeps the canonical `latch_audit` column list (session 6.2); no per-app table forks.

## Verify (stop gate)

- [x] `@latch/adapter-pg-audit` builds and exports `createPostgresAuditWriter`.
- [x] Template imports the package; `template/lib/audit-db-writer.ts` deleted.
- [x] No remaining `audit-db-writer.ts` copy anywhere (grep clean).
- [x] Package tests cover INSERT + `SET LOCAL` actor binding.
- [x] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `03-pg-session.md`.

## Out of scope

- `withPermissionDb` extraction (task 03), `ensureAuditWriter` bootstrap (task 07), audit-mode gating (task 05).
