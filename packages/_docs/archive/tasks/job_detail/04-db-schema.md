# 04 — Database schema and seed

## Goal

Drizzle schema + SQL migration for pilot tables; seed two users and two jobs (own vs other tech).

## Prerequisites

[03-policy.md](./03-policy.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/package.json` | Add `drizzle-orm`, `zod` |
| `packages/dal/src/schema.ts` | `jobs`, `assignments`, `latch_users`, `latch_audit` |
| `apps/web/migrations/001_init.sql` | DDL + audit immutability trigger stub |
| `packages/dal/src/seed.ts` | Constants: `SEED_TECH_ID`, `SEED_ADMIN_ID`, `SEED_JOB_OWNED`, `SEED_JOB_OTHER` |
| `packages/dal/src/jobs/memory-store.ts` | In-memory store for tests/dev without Postgres |
| `packages/dal/src/seed.ts` | `seedPilotJobs(store)` |

## Steps

1. Read [`../../architecture/audit-and-lifecycle.md`](../../../../audit/docs/audit-and-lifecycle.md).
2. Define `jobs` with `deleted_at`, `deleted_by`, `contract_amount`, etc.
3. Define `assignments` (`job_id`, `user_id`) for row-scope **own**.
4. Document applying migration: `psql $DATABASE_URL -f apps/web/migrations/001_init.sql` (optional for CI; memory store required for tests).
5. Seed: job A assigned to tech seed user; job B assigned to another user.

## Verify (stop gate)

- [x] `seedPilotJobs` populates memory store with two jobs
- [x] Schema types export from `@latch/dal`
- [x] Migration file exists and is valid SQL
- [x] `STATUS.md` → **05-audit-skeleton.md**

## Out of scope

DAL read/write logic; Postgres connection in production path.
