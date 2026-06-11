# 12 — Delete audit tests (T16)

> **Status:** Complete (2026-06-02). Next: [20-e2e-restore.md](./20-e2e-restore.md).

## Goal

Prove **T16** — no audit gap on delete: single-record and bulk delete each produce the expected audit rows (`delete` per entity; optional `bulk_summary` on bulk).

## Prerequisites

- [08-retention-seam.md](./08-retention-seam.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | **T16** — single delete + bulk delete audit assertions |
| `packages/dal/src/create-surface-dal.test.ts` | Strengthen delete/bulk audit coverage if gaps remain |

## Steps

1. Read [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) — **T16**.
2. **Single delete:** delete one job via DAL → exactly one audit entry with `action: 'delete'`, matching `entity_id`, non-null `before`.
3. **Bulk delete:** delete N permitted rows → N `delete` audit entries (+ optional `bulk_summary` if bulk path emits it).
4. **Negative:** failed delete (forbidden / not found) → no `delete` audit row for that id.
5. Use memory audit writer (primary); optional Postgres assertion behind `DATABASE_URL` if harness exists.
6. Do not duplicate full restore tests (task **20**).

## Verify (stop gate)

- [x] `npm run test` — T16 cases green
- [x] Bulk path covered (reuse `job_list` / fixture descriptor tests)
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `20-e2e-restore.md`

## Out of scope

- T6 (task **04** / **21**)
- Business-table DB triggers
- Restore replay (task **20**)
