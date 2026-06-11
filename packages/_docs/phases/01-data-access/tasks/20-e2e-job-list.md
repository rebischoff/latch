# 20 — E2E test (`job_list`)

## Goal

Stack-level test covering policy → DAL → list DTO (S1) and bulk partial success (S2). No HTTP required unless you choose to add route integration.

## Prerequisites

[16-jobs-list-page.md](./16-jobs-list-page.md) complete (or API-only path: task **13** complete with page deferred).

## Files

| File | Action |
|------|--------|
| `tests/job-list.e2e.test.ts` | **Create** — list + bulk scenarios |
| `vitest.config.ts` | Confirm path aliases for `@latch/*` |

## Steps

1. Seed store; resolve manifests for tech vs admin with `surface: 'job_list'`.
2. **S1:** tech `list` — row count and ids match assignment scope; DTOs lack `financial_terms`.
3. **S1:** admin `list` — same seed includes `financial_terms` on rows where granted.
4. **S2:** admin `bulkUpdate` 20 ids with 5 not in scope → 15 succeeded, 5 skipped (`partial`).
5. **S2:** same ids with `all_or_nothing` → no successful writes when any skip.
6. Assert strict bulk patch rejection (unknown key).

## Verify (stop gate)

- [ ] `npm run test` — `job-list.e2e.test.ts` green
- [ ] [`../STATUS.md`](../STATUS.md) → **21-threat-tests.md**

## Out of scope

Playwright browser test, threat file changes (task **21**).
