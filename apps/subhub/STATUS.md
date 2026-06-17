# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-16.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Slice 1 complete (contacts UI). **Schema design pass** — DBML through Slice 6; migrations deferred.

## Right now — do this next

**Task 18 — site migration** — first SQL batch after schema pass: party refactor + sites/locations per [`18-site-migration.md`](./docs/tasks/18-site-migration.md). Review [`schema/current.dbml`](./docs/schema/current.dbml) and migration batch order before writing `018+`.

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| [00 — App shell](./docs/tasks/01-task-index.md#slice-00--app-shell) | Layout, nav, auth, IAM surfaces | complete (tasks 04–09) |
| [01 — Party / contacts](./docs/tasks/01-task-index.md#slice-01--party--contacts) | `party` model, phones/emails, subsets | **complete** (tasks 10–14) |
| **Schema** | DBML Slices 2–6 | **complete** (task [17](./docs/tasks/17-schema-design-pass.md)) — migrations next |
| [02 — Sites](./docs/tasks/01-task-index.md#slice-02--sites) | Sites, locations, site contacts | **pending** (task [18](./docs/tasks/18-site-migration.md) migration → 19–20 surfaces/UI) |
| [03 — Catalog](./docs/tasks/01-task-index.md#slice-03--catalog) | Parts, items, vendor pricing | planned (DBML drafted) |
| [04 — Estimates](./docs/tasks/01-task-index.md#slice-04--estimates) | Sales quotes + line items | planned (DBML drafted) |
| [05 — Jobs](./docs/tasks/01-task-index.md#slice-05--jobs--change-orders) | BOM explosion, progress, COs | planned (DBML drafted) |
| [06 — Financial](./docs/tasks/01-task-index.md#slice-06--financial) | Invoices, POs, progress billing | planned (DBML drafted) |
| [07 — Reports](./docs/tasks/01-task-index.md#slice-07--reports) | Job progress aggregates | planned |

## Recently completed

- **17 — Schema design pass** — `current.dbml` extended through Slice 6 (catalog, estimates, jobs, financial); `job_party_relation` catalog; schema-first decision ([`decisions.md`](./docs/decisions.md#decision-schema-first--finish-dbml-before-migrations-2026-06-16)) (2026-06-16).
- **16 — Slice 2 planning gate** — empty relation catalog; deferred `party_location` UI + site hierarchy; progressive setup for catalogs; tasks 18–19 headline scope ([`decisions.md`](./docs/decisions.md#decision-slice-2-ui-scope--planning-gate-2026-06-16)) (2026-06-16).
- **15 — Entity flow** — cross-slice relationship map in [`architecture.md`](./docs/architecture.md#entity-flow) (2026-06-16).
- **14 — Contact child collections** — phones/emails on `contact_detail` (2026-06-13).
- **13 — Contact UI** — `/contacts` master-detail (2026-06-13).
- **12 — Contact DAL and API** (2026-06-13).
- **11 — Contact surfaces** (2026-06-13).
- **10 — Party migration** — `016_party.sql` (2026-06-13).

## Pointers

- [Schema DBML](./docs/schema/current.dbml) · [Schema workflow](./docs/schema/README.md) · [dbdiagram](https://dbdiagram.io/d/latch-6a3215ad5c789b8acb9d5278)
- [Decisions](./docs/decisions.md) — locked choices
- [Architecture](./docs/architecture.md) — data model + entity flow
- [Routing & libraries](./docs/routing-and-libraries.md)
- [Child collections](./docs/child-collections.md)
- [Latch feedback](./docs/latch-feedback.md)
- [Scaffold runbook](../../packages/codegen/docs/scaffold-runbook.md)
