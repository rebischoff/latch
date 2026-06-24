# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-23.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Task **23** wave **5a** jobs **active**. Estimate 4a complete. Catalog-first order locked — job shell before wave **3** catalog + shared line editor.

## Right now — do this next

**[Task 23 — job wave 5a](./docs/tasks/23-job-wave-5a.md) step 1:** `023_job.sql` migration (`job`, `job_party` + `sort_order`, `job_line`). Then YAML, DAL, `/jobs` Overview + stub tabs. No Scope line grid in 5a.

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **04 — Estimates** | Wave 4a flat quote UI | **complete** ([task 22](./docs/tasks/22-estimate-wave-4a.md)); line UI **interim** until 4d′ |
| **05 — Jobs** | Wave 5a shell | **active** ([task 23](./docs/tasks/23-job-wave-5a.md)) |
| [02 — Sites](./docs/tasks/01-task-index.md#task-20--ui-discovery) | Sites CRM slice | complete |
| **03 — Catalog** | `part` + `item` | **next after job 5a shell** (catalog-first) |
| **Surface specs** | Implement-tier docs | **16/27** — catalog specs **#15–18** next |
| **UI discovery** | Task 20 | complete (2026-06-23) |

## Recently completed

- **Task 23 created** — job wave 5a implementation steps ([`23-job-wave-5a.md`](./docs/tasks/23-job-wave-5a.md)) (2026-06-23).
- **Job wave 5 planning session** — catalog-first order locked; 5a = job shell (Overview only); line UI after wave 3 + shared editor; [`job.md` decision](./docs/decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23) + estimate wave 4 amendment (2026-06-23).
- **Task 22 step 9** — stakeholders + flat line editor: `EstimateStakeholderFields` (party + relation pickers, empty-catalog CTA → `/party-relations`), `EstimateLineItemsField` (flat antd `Table` — kind/desc/qty/unit/cost/sell/ext; Add line, Add kit header+component, kit cascade delete); wired to PATCH/POST replace-array; `JobPartyRelationCatalog` page at `/party-relations`; `/estimates/demo` documented as superseded (2026-06-23).
- **Task 22 step 8** — estimate UI shell: `EstimateList` (title, site, status, date + New); `EstimateDetailForm` profile (title, site picker, dates, status); Save/Revert/Delete toolbar; site hub link; create flow POST (2026-06-23).
- **Task 22 step 7** — nav + routes: `routes.estimates.list` / `detail(id)`; Sales group `estimate_list` in `SURFACE_NAV_CATALOG`; `estimates/(master-detail)/` layout + pages; `/estimates/demo` spike isolated outside master-detail (2026-06-23).
- **Task 22 step 6** — estimate API routes + surface-api: `GET /api/estimates`, `GET/PATCH/POST/DELETE /api/estimates/[id]`, site picker; `estimate_list` / `estimate_detail` in loader registry + `SURFACE_API` (2026-06-23).
- **Task 22 step 5** — estimate DAL write + delete: `create`, `patch`, `delete` on `estimate_detail`; replace-array for `stakeholders` / `line_items`; kit integrity + site location validation; block line PATCH when `won` (2026-06-23).
- **Task 22 step 4** — estimate DAL read path: `estimateList.list`, `estimateDetail.get` with manifest-narrowed `profile`, `stakeholders`, `line_items` (2026-06-23).
- **Task 22 step 3** — `job_party_relation` catalog DAL + `/api/estimates/party-relations` CRUD; `InUseError` on delete when `estimate_party` references row (2026-06-23).
- **Task 22 step 2** — `estimate_list` / `estimate_detail` / `job_party_relation_table` YAML + policy registry; `codegen:check` passes (2026-06-23).
- **Task 22 step 1** — `021_estimate.sql` + `022_job_party_relation_dev_seed.sql` applied in dev (2026-06-23).
- **Task 20 — UI discovery** — planning session + [`estimate.md`](./docs/surface-specs/estimate.md) spec (2026-06-23).
- **Task 22 created** — wave 4a implementation steps ([`22-estimate-wave-4a.md`](./docs/tasks/22-estimate-wave-4a.md)) (2026-06-23).

## Pointers

- [Job wave 5 decision](./docs/decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23) · [Estimate wave 4](./docs/decisions/estimate.md#decision-estimate-wave-4--implementation-order-2026-06-23) (amended)
- [Task 22 — estimate wave 4a](./docs/tasks/22-estimate-wave-4a.md) · [Estimate spec](./docs/surface-specs/estimate.md)
- [Schema DBML](./docs/schema/current.dbml) · [Decisions](./docs/decisions/README.md)
