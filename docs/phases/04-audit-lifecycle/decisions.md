# Phase 04 — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Audit immutability | Append-only; no UPDATE/DELETE on audit rows |
| 2026-05-27 | Retention default | 3 years; partition by month |
| 2026-05-30 | **Delete model (global)** | **Hard delete only.** No `deleted_at` / soft delete. Live row removed; audit `before` snapshot; recovery = restore-from-audit (privileged replay). Locked in [`../../foundations/scope.md`](../../foundations/scope.md). |
| 2026-05-30 | Audit action for delete | Single action: **`delete`** (not `soft_delete` / `hard_delete`). |
| 2026-05-30 | Policy action for delete | Surface/Field action **`delete`** gates who may remove live rows. |

## Open / to lock in this phase

- [ ] **Cascade policy** for related data on hard delete (DB CASCADE vs ordered DAL delete per Surface).
- [ ] **Restore-from-audit** tool (privileged replay) + minimal operator UI + test.
- [ ] **Retention/storage config** surface: retention years, partition strategy, archive target.
- [ ] DB-level immutability verified for app role (T6).

## Superseded

| Date | Topic | Superseded by |
|------|-------|----------------|
| 2026-05-27 | v1 delete = soft delete only | 2026-05-30 hard delete only |
