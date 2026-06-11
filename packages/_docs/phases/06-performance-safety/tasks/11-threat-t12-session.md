# 11 — Session vars and threat T12

> **Status:** Complete (2026-06-03). Next: [20-e2e-performance-safety.md](./20-e2e-performance-safety.md).

## Goal

Wrap **Postgres-backed** DB access so each transaction begins with **`SET LOCAL app.principal_id`** (and constant `app.company_id`); prove no actor carry-over across requests (**T12**). This binding is the seam future RLS (Phase 07) will depend on, and it independently fixes actor attribution under pooled connections.

> **Scope note:** Jobs use [`MemoryJobStore`](../../../../../apps/crm/src/lib/pilot-store.ts), so the realistic targets are the **Postgres paths that exist**: the audit writer, the pending store (`latch_pending_changes`), and IAM (`latch_policy_version` bump). Do not pretend the jobs read path is SQL-gated in v1.

## Prerequisites

- [10-latch-app-role-t5.md](./10-latch-app-role-t5.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/audit/src/permission-db.ts` (+ re-export from `@latch/dal`) | `withPermissionDb(pool, principalId, fn)` — `BEGIN; set_config …; <work>; COMMIT;` |
| `apps/crm/src/lib/audit-db-writer.ts` / pending store / `policy-version.ts` | Wire `withPermissionDb` on the real PG clients |
| [`tests/threat.test.ts`](../../../../../tests/threat.test.ts) | T12 alternating actors (reuse `it.runIf` + `pg` Pool pattern) |
| [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) | Mark T12 control tested |

## Steps

1. Centralize `SET LOCAL` at transaction start from `PermissionContext.principal.id` on the **Postgres** writers (audit / pending / IAM). `SET LOCAL` requires an explicit transaction — wrap accordingly.
2. v1 `app.company_id` = constant (single company).
3. **T12 test** (`it.runIf(latchAppDatabaseUrl)`): alternate two principals writing audit/pending rows rapidly → each row records the correct `actor_id` / `submitted_by` (no carry-over from a reused pooled connection).
4. **No RLS dependency in v1** — RLS is deferred to Phase 07, so this task proves actor binding for audit/pending alone. The `SET LOCAL` plumbing is intentionally landed now so Phase 07 RLS can rely on it.

## Verify (stop gate)

- [x] T12 test green when DB present; `it.runIf`-skipped otherwise
- [x] DAL/writer unit test (no DB) asserts `SET LOCAL` is issued before work in the transaction
- [x] `npm run test` green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `20-e2e-performance-safety.md`

## Out of scope

Moving the job store to Postgres. RLS policies (Phase 07). Multi-company pool routing / T9 (Phase 07). Vercel edge without Node `pg`.
