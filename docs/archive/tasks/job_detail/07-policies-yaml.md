# 07 — `job_detail.policies.yaml`

## Goal

Role → Field grants for `field_tech` and `office_admin`, aligned with use-case S1/S3.

## Prerequisites

[06-surface-yaml.md](./06-surface-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/modules/job/job_detail.policies.yaml` | **Create** |
| `packages/policy/src/surfaces/job-detail.ts` | Update to match YAML (or add YAML loader) |

## Steps

1. `field_tech`: `rowScope: own`; read/write `summary`, `scope`; read `assignments`; empty `financial_terms`; explicit `deny` on financial read/write/approve.
2. `office_admin`: `rowScope: all`; full summary/scope/financial/assignments including `approve` on financial.
3. Sync embedded policy in `@latch/policy` with this file (single source: YAML preferred long-term).

> **Runtime truth (Step 3):** the TS policy in `@latch/policy` is what actually enforces at runtime; this YAML is documentation that must be hand-synced. A YAML→runtime loader is deliberately deferred (see [`08-codegen.md`](./08-codegen.md) "Out of scope").

## Verify (stop gate)

- [x] Policy tests still pass after sync
- [x] YAML Field ids match `job_detail.surface.yaml`
- [x] `STATUS.md` → **08-codegen.md**

## Out of scope

Codegen CLI implementation.
