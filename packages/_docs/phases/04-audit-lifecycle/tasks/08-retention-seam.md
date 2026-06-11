# 08 — Retention config seam + partition sketch

> **Status:** Complete (2026-06-02). Next: [`12-delete-audit-tests.md`](./12-delete-audit-tests.md).

## Goal

Wire **`auditRetentionYears`** (default 3) into `@latch/audit` or CRM config as a read-only seam; document monthly partition DDL and operator archive notes. **No automated partition drop in CI.**

## Prerequisites

- [07-restore-tool.md](./07-restore-tool.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/audit/src/types.ts` or `config.ts` | **Create/extend** — `AuditConfig { retentionYears }` |
| `packages/audit/src/index.ts` | Export config type / getter |
| [`../../../foundations/global-options.md`](../../../foundations/global-options.md) | Cross-link to audit package seam |
| [`../../../reference/audit-and-lifecycle.md`](../../../../audit/docs/audit-and-lifecycle.md) | Partition sketch + “automation deferred” note |
| [`../../../../apps/crm/docs/DATABASE.md`](../../../../../apps/crm/docs/DATABASE.md) | Example `PARTITION BY RANGE (occurred_at)` sketch; runbook paragraph |

## Steps

1. Read [`00-decisions.md`](./00-decisions.md) §6 — retention seam only.
2. Add typed config defaulting to **3** years; CRM may re-export from env later.
3. Document monthly partition strategy on `latch_audit.occurred_at` (SQL comment or doc block — do not require partitioned table in pilot migration unless trivial).
4. State archive/drop is **operator responsibility** post-retention; link `auditRetentionYears`.
5. No cron/job implementation in this task.

## Verify (stop gate)

- [x] Config type exported; default 3 documented
- [x] Reference + `DATABASE.md` updated with partition sketch and deferred automation
- [x] `npm run test` and `npm run build` pass (no regressions)
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `12-delete-audit-tests.md`

## Out of scope

- Automated partition create/drop
- GDPR erasure / pseudonymize mode
- Migrating existing `latch_audit` to partitioned table in CI
