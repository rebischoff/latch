# STATUS — Phase 01 Data access

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-01.

- **Home package:** `@latch/dal`
- **State:** complete — `job_list` (list + bulk) proven end-to-end

## Execute now

Phase complete. Next active phase is set in the root [`../../../STATUS.md`](../../../STATUS.md) → **02 UI sync**.

## Blockers

None. Uses the stub principal (real auth is Phase 03).

## Recently completed

- Task **21** — threat coverage extended in `tests/threat.test.ts`: **T2 (list)** tech list DTO omits `financial_terms` (key absence, not `null`); **T15** row-scoped bulk update with a mixed permitted/forbidden batch — `all_or_nothing` → zero DB mutation + no audit rows, `partial` → permitted row applied / forbidden skipped (`not_found`) with consistent DB and `update` + `bulk_summary` audit. Fixed a pre-existing `apply-patch.ts` union type error (`scope` only on `job_detail` patch) so `npm run build` passes. `npm run test` (58 passed / 1 skipped), `npm run codegen:check`, and `npm run build` all green. Phase 01 definition of done satisfied.

- Task **20** — `tests/job-list.e2e.test.ts`: stack-level policy → DAL → list DTO (S1 tech/admin row scope + `financial_terms` projection) and bulk partial success (S2: 15 succeeded / 5 skipped partial, no writes on `all_or_nothing`, strict patch rejection). `npm run test` green (55 passed).

- Task **16** — `/jobs` list page (RSC, manifest-driven columns via `fieldAllows`); home `/` link to `/jobs`. Verified locally: `field_tech` sees only assigned job, no financial column; `office_admin` sees all rows + `Contract amount`; rows link to `/jobs/[id]`.

- Task **13** — REST `GET /api/jobs`, `PATCH`/`DELETE` `/api/jobs:bulk`; `resolveContext` for `job_list`; `jsonBulkResult` (`200` partial, `409` `all_or_nothing`); `isLatchError` in API error mapper.
- Task **12** — DAL contract tests: `job_list` list projection (T2), row scope, strict bulk patch, T15 partial / `all_or_nothing` for bulk update + delete; empty list for unassigned tech.
- Task **11** — `dal.jobs.bulkDelete`: shared `job-delete.ts` helpers; `partial` / `all_or_nothing`, per-row `not_found`, audit + optional `bulk_summary`.
- Task **10** — `dal.jobs.bulkUpdate`: `bulk.ts`, `BulkUpdateResult` in contracts; partial / `all_or_nothing`, strict patch, per-row skip reasons, audit + optional `bulk_summary`.
- Task **09** — `dal.jobs.list`: `list-project.ts`, `repository.list`, list query schema; contract tests (tech/admin/empty/limit/status).
- Task **08** — [`job_list.schema.generated.ts`](../../../apps/crm/modules/job/generated/job_list.schema.generated.ts); `COLUMN_ZOD` extended for list joins; `npm run codegen:check` passes.
- Task **07** — [`job_list.policies.yaml`](../../../apps/crm/modules/job/job_list.policies.yaml) + app policy registry in [`apps/crm/src/lib/policy/`](../../../apps/crm/src/lib/policy/).
- Task **06** — [`job_list.surface.yaml`](../../../apps/crm/modules/job/job_list.surface.yaml) (Fields: `summary`, `customer_site`, `financial_terms`, `assignments`).
- Task chain documented under [`tasks/`](./tasks/) (00–01, 06–21).
- Task **00** — list/bulk defaults locked ([`decisions.md`](./decisions.md), [`global-options.md`](../../foundations/global-options.md)).
- Phase plan scoped (carried over from the former "Step 4" doc).
- Foundation stack (Phase 00) proven on `job_detail`.
