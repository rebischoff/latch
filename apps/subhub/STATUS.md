# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-12.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Slice 0 in progress — **app shell layout** is next.

## Right now — do this next

**[03 — App shell layout](./docs/tasks/03-app-shell-layout.md)** — `(public)` / `(app)` route groups, sidebar shell, mount `Providers`.

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| [00 — App shell](./docs/tasks/01-task-index.md#slice-00--app-shell) | Layout, nav, auth, IAM surfaces | **next** (tasks 02–09) |
| [01 — Party / contacts](./docs/tasks/01-task-index.md#slice-01--party--contacts) | `party` model, phones/emails, subsets | planned (tasks 10–17) |
| [02 — Sites](./docs/tasks/01-task-index.md#slice-02--sites) | Locations, systems, site contacts | planned |
| [03 — Catalog](./docs/tasks/01-task-index.md#slice-03--catalog) | Parts, items, vendor pricing | planned |
| [04 — Estimates](./docs/tasks/01-task-index.md#slice-04--estimates) | Sales quotes + line items | planned |
| [05 — Jobs](./docs/tasks/01-task-index.md#slice-05--jobs--change-orders) | BOM explosion, progress, COs | planned |
| [06 — Financial](./docs/tasks/01-task-index.md#slice-06--financial) | Invoices, POs, progress billing | planned |
| [07 — Reports](./docs/tasks/01-task-index.md#slice-07--reports) | Job progress aggregates | planned |

## Recently completed

- **02 — UI dependencies** — antd, RHF, React Query, `AntdRegistry`, `Providers` (2026-06-12).
- Planning session — architecture, decisions, task index, routing/library guidance (2026-06-12).

## Pointers

- [Decisions](./docs/decisions.md) — locked choices (no approval, party model, explicit routes)
- [Architecture](./docs/architecture.md) — data model + surface catalog
- [Routing & libraries](./docs/routing-and-libraries.md) — pages, API, Ant Design, RHF, React Query
- [Child collections](./docs/child-collections.md) — phones, emails, line items on a parent Surface
- [Latch feedback](./docs/latch-feedback.md) — platform gaps discovered while building SubHub
- [Scaffold runbook](../../packages/codegen/docs/scaffold-runbook.md) — migrations, env, codegen
