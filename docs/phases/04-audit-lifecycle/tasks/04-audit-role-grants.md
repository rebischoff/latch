# 04 — Audit role grants (`latch_app`, T6)

> **Status:** Complete (2026-06-02). Next: [`05-cascade-docs.md`](./05-cascade-docs.md).

## Goal

Introduce the application DB role with **INSERT-only** access on `latch_audit`; keep the existing immutability trigger. Update threat **T6** so CI exercises tamper rejection as `latch_app`, not superuser.

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete (verify gate passed).
- [01-task-index.md](./01-task-index.md) read.

## Files

| File | Action |
|------|--------|
| `apps/crm/migrations/` | New migration: `latch_app` role, grants on business tables + `INSERT` on `latch_audit` |
| `apps/crm/docs/DATABASE.md` | Document role, connection string pattern, dev vs prod |
| `tests/threat.test.ts` | T6 SQL test connects as `latch_app` when env provides app-role URL |
| `.github/workflows/ci.yml` | Optional: `LATCH_APP_DATABASE_URL` or role bootstrap in CI Postgres |
| `apps/crm/.env.example` | Document `DATABASE_URL` vs app role (if split) |

## Steps

1. Read [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) — **T6**.
2. Migration creates **`latch_app`** (or documents reuse of deployment role name from decisions).
3. Grants: **`INSERT`** on `latch_audit`; **no** `UPDATE` / `DELETE` on `latch_audit`. Existing SELECT/INSERT/UPDATE/DELETE on business tables as needed for CRM runtime.
4. Keep **`latch_audit_deny_mutation`** trigger (belt + suspenders per [`00-decisions.md`](./00-decisions.md)).
5. Extend T6 test: attempt `UPDATE latch_audit SET action = 'tamper'` as app role → permission error or trigger exception.
6. Keep unit-level proxy test (no `updateAudit` / `deleteAudit` exports on `@latch/audit`).

## Verify (stop gate)

- [x] Migration SQL applies cleanly on fresh Postgres
- [x] `npm run test` — T6 green (DB path when app-role URL set; unit proxy always)
- [x] `DATABASE.md` documents production must not use superuser for app runtime
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `05-cascade-docs.md`

## Out of scope

- Business-table mutation triggers
- Retention partition DDL (task **08**)
- Restore tool (task **07**)
