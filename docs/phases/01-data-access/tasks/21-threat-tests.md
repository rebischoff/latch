# 21 — Threat tests (T15 + list T2) + phase DoD

## Goal

Extend CI threat coverage for bulk atomicity (**T15**) and list DTO forbidden-field omission (**T2**). Mark Phase 01 definition of done.

## Prerequisites

[20-e2e-job-list.md](./20-e2e-job-list.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | Add T15 bulk mixed batch; list T2 snapshot/assertions |
| `.github/workflows/ci.yml` | Confirm `codegen:check`, `test`, `build` |
| [`../README.md`](../README.md) | Check off definition-of-done items when verified |

## Steps

1. Read [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) — T15, T2.
2. **T15:** bulk `all_or_nothing` with mixed permitted/forbidden ids — assert zero DB mutation; `partial` — assert per-row result and consistent DB.
3. **T2 (list):** tech `list` DTO — assert no `financial_terms` key (property absence, not `null`).
4. **T11:** `npm run codegen:check` still passes with `job_list` generated files.
5. Run full `npm run test` and `npm run build`.
6. Update [`../STATUS.md`](../STATUS.md) — phase complete; root [`../../../STATUS.md`](../../../STATUS.md) → next phase (default **02 UI sync** unless change order).

## Verify (stop gate)

- [x] `npm run test` — threat + e2e + packages green (58 passed / 1 skipped)
- [x] `npm run codegen:check` passes
- [x] `npm run build` passes
- [x] Phase README definition of done items satisfied:
  - [x] Tech `GET /api/jobs` omits financial columns; assigned rows only
  - [x] Admin bulk partial: 15 succeeded / 5 skipped scenario
  - [x] `all_or_nothing` → 409, no rows changed
- [x] [`../STATUS.md`](../STATUS.md) → Phase 01 complete; root STATUS repointed

## Out of scope

Full threat matrix T4–T14, T16–T17 (implement controls as needed; tests may follow in later phases).
