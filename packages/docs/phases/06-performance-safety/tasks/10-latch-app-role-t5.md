# 10 — `latch_app` connection + threat T5

> **Status:** Complete (2026-06-03). Next: [11-threat-t12-session.md](./11-threat-t12-session.md).

## Goal

The `latch_app` non-superuser role **already exists** (migration [`005`](../../../../apps/crm/migrations/005_latch_app_role.sql)). This task (a) ensures grants cover tables added since 005, (b) ensures CRM/CI actually **connect as** `latch_app`, and (c) adds the **T5** `current_user` assertion. **No new role creation.**

> **T5 is a v1 CI minimum** ([`threat-model.md`](../../../foundations/threat-model.md) — "Minimum tests in CI before v1 ships: T1, T2, T3, T5, T6, T11, T13, T15"). This task is not optional, independent of the RLS deferral.

## Prerequisites

- [09-benchmark-cache.md](./09-benchmark-cache.md) complete.
- [04-policy-version.md](./04-policy-version.md) complete (its migration must grant `latch_app` on `latch_policy_version`).

## Files

| File | Action |
|------|--------|
| `apps/crm/migrations/` | Grants top-up **only if** any table lacks `latch_app` grants (verify 005 + 006 + 007 cover all) |
| `apps/crm/docs/DATABASE.md` | Document that runtime/CI `DATABASE_URL` must be `latch_app`, not the owner role |
| [`tests/threat.test.ts`](../../../../tests/threat.test.ts) | **T5** case beside existing T6 block (reuse `LATCH_APP_DATABASE_URL` + `it.runIf` + `pg` Pool) |

## Steps

1. Audit current grants: confirm `005` (jobs/assignments/customers/sites/users/user_roles + audit INSERT) + `006` (pending) + `007` (policy_version) cover every table the DAL touches. Add a guarded top-up migration only for gaps.
2. Document connection-role expectation in `DATABASE.md`; reference `LATCH_APP_DATABASE_URL` for tests.
3. **T5 test** (mirrors T6 harness already in `threat.test.ts` ~line 439): `it.runIf(Boolean(latchAppDatabaseUrl()))` → `SELECT current_user` returns `latch_app`; assert role is **not** superuser (`SELECT rolsuper FROM pg_roles WHERE rolname = current_user` → false).
4. Update [`open-questions.md`](../../../foundations/open-questions.md) "app role is not superuser" row → Resolved.

## Verify (stop gate)

- [x] T5 test passes when `LATCH_APP_DATABASE_URL` / `latch_app` `DATABASE_URL` set; `it.runIf`-skipped otherwise (no failure absent DB)
- [x] `npm run test` green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `11-threat-t12-session.md`

## Out of scope

Creating the role (done in Phase 04). RLS (deferred to Phase 07). Neon IAM, pooler config (Phase 07).
