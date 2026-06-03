# 21 — Threat T6 + T16 + phase DoD

> **Status:** Complete (2026-06-02). Phase 04 closed; root STATUS → Phase 05.

## Goal

Close threat **T6** (audit tampering) and **T16** (delete audit gap) in CI; check off Phase 04 definition of done; repoint root STATUS to Phase 05 (default).

## Prerequisites

- [20-e2e-restore.md](./20-e2e-restore.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | Confirm T6 + T16 covered; no regressions |
| [`../README.md`](../README.md) | Check off definition-of-done items |
| [`../STATUS.md`](../STATUS.md) | Phase complete |
| [`../../../../STATUS.md`](../../../../STATUS.md) | Repoint active phase → **05 Verification** (unless change order) |

## Steps

1. Read [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) — T6, T16.
2. **T6:** app role cannot UPDATE `latch_audit`; `@latch/audit` has no update/delete helpers.
3. **T16:** single + bulk delete audit presence (from task **12**); spot-check in this task.
4. Run `npm run test`, `npm run build`, `npm run codegen:check`.
5. Update phase + root STATUS per [45-phase-tasks.mdc](../../../../.cursor/rules/45-phase-tasks.mdc).

## Verify (stop gate)

- [x] `npm run test` — threat + e2e + packages green
- [x] `npm run codegen:check` passes
- [x] `npm run build` passes
- [x] Phase README definition of done:
  - [x] Audit action set complete (`delete`, `restore`, `bulk_summary` as needed; `approve`/`reject` deferred to Phase 05)
  - [x] DB-level immutability verified for app role (T6)
  - [x] Hard delete path with documented cascade per Surface
  - [x] Restore-from-audit tool with test
  - [x] Retention/partition options honored (seam + docs)
  - [x] Pilot schema: no `deleted_at` on new tables (already done)
- [x] [`../STATUS.md`](../STATUS.md) → Phase 04 complete
- [x] Root [`../../../../STATUS.md`](../../../../STATUS.md) repointed to Phase 05 (unless change order)

## Out of scope

- Phase 05 pending store / `approve` audit wiring
- CRM restore admin UI
- Business-table mutation triggers
- T17 denied-access audit
