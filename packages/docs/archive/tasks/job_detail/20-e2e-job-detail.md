# 20 — E2E test (`job_detail`)

## Goal

One automated test covering policy → DAL → DTO (S1 + S4 + strict PATCH).

## Prerequisites

[19-react-gates.md](./19-react-gates.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/job-detail.e2e.test.ts` | Stack-level test (no HTTP required) |
| `vitest.config.ts` | Path aliases for `@latch/*` |

## Steps

1. Seed store; resolve manifests for tech vs admin.
2. Assert DTO shape difference on same job id.
3. Assert `NotFoundError` for cross-tech access.
4. Assert `ValidationError` on unknown PATCH key.

## Verify (stop gate)

- [ ] `npm run test` — e2e file green
- [ ] `STATUS.md` → **21-threat-tests.md**

## Out of scope

Playwright browser test (optional later).
