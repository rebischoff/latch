# 12 — DAL contract tests

## Goal

Automated tests for forbidden-field omission and strict-write rejection.

## Prerequisites

[11-dal-soft-delete.md](./11-dal-soft-delete.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/jobs/repository.test.ts` | Contract tests |

## Steps

1. Use `MemoryJobStore` + `seedPilotJobs`.
2. Assert tech DTO has no `financial_terms` property (`expect(dto).not.toHaveProperty(...)`).
3. Assert strict PATCH `{ summary: {...}, evil: true }` throws `ValidationError`.
4. Assert cross-tech read throws `NotFoundError`.

## Verify (stop gate)

- [ ] `npm run test` includes dal contract tests — all green
- [ ] `STATUS.md` → **13-api-route.md**

## Out of scope

HTTP E2E (task **20**).
