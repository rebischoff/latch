# 17 — Audit triggers (Postgres)

## Goal

DB-level append-only `latch_audit` and mutation trigger on `jobs` (safety net under DAL audit).

## Prerequisites

[16-job-detail-page.md](./16-job-detail-page.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/migrations/001_init.sql` | Triggers (extend from task 04) |
| `apps/web/src/lib/audit-db-writer.ts` | Optional: `setAuditWriter` → INSERT |

## Steps

1. Trigger: `BEFORE UPDATE OR DELETE ON latch_audit` → raise exception (immutable).
2. `AFTER UPDATE ON jobs` → insert audit row (or rely on DAL `writeAudit` only for v1 — document choice).
3. Wire Postgres writer when `DATABASE_URL` set.

## Verify (stop gate)

- [x] Migration applies on local Docker Postgres
- [x] Manual UPDATE on `latch_audit` fails
- [x] `STATUS.md` → **18-approval-minimal.md**

### Decision (2026-05-28)

**Choice:** DAL `writeAudit` + Postgres writer when `DATABASE_URL` is set; `latch_audit` immutability trigger only (no `jobs` AFTER UPDATE trigger).

**Rationale:** Avoid duplicate audit rows on the normal DAL path; table-level safety net for `jobs` deferred.

## Out of scope

Retention partitioning.
