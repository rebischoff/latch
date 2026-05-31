# 21 — Threat tests + CI

## Goal

Tests for T1, T2, T3, T6, T11, T13 and minimal GitHub Actions workflow.

## Prerequisites

[20-e2e-job-detail.md](./20-e2e-job-detail.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | T1 strict schema, T2 forbidden-field omission, T3 re-resolve (stale manifest), T6 audit immutability, T11 codegen check, T13 field-reference forgery (unknown `field_id` → 400) |
| `.github/workflows/ci.yml` | `npm ci`, `codegen:check`, `test`, `build` |
| Root `package.json` | `test`, `codegen`, `codegen:check` scripts |

## Steps

1. Read [`../../threat-model.md`](../../../foundations/threat-model.md) for threat definitions.
2. T11: call `runCodegen(true)` from `@latch/codegen`.
3. T6: attempt `UPDATE latch_audit` from the app role → expect a permission error (Postgres path from task 17). Where no DB is available in CI, assert the `@latch/audit` API exposes **no** update/delete helper as the unit-level proxy, and gate the SQL assertion behind `DATABASE_URL`.
4. T3 (stale manifest): simulate by re-resolving with a changed manifest between calls (stub principal cannot truly revoke a role) → next write returns 403. Control is implemented; this is the simulated form.
5. CI on push/PR to main.
6. Mark Step 3 definition-of-done items in [`../../step-3-pilot-surface.md`](../../step-3-pilot-surface.md).

## Verify (stop gate)

- [x] `npm run test` — all packages + threat + e2e green
- [x] T6: `UPDATE latch_audit` from app role rejected (or audit API exposes no update/delete helper when no DB)
- [x] `npm run codegen:check` passes
- [x] `npm run build` passes
- [x] `STATUS.md` → **Step 4** (`job_list` suggested in STATUS)

## Out of scope

Full threat matrix T4–T17.
