# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-15.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Slice 1 complete — party/contacts with phones/emails; Slice 2 (sites) next.

## Right now — do this next

**Slice 2 — task 15** — entity flow sketch per [`15-entity-flow.md`](./docs/tasks/15-entity-flow.md) (docs only; then **16** planning gate, then **17** migration).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| [00 — App shell](./docs/tasks/01-task-index.md#slice-00--app-shell) | Layout, nav, auth, IAM surfaces | complete (tasks 04–09) |
| [01 — Party / contacts](./docs/tasks/01-task-index.md#slice-01--party--contacts) | `party` model, phones/emails, subsets | **complete** (tasks 10–14) |
| [02 — Sites](./docs/tasks/01-task-index.md#slice-02--sites) | Sites, locations, site contacts | **next** (tasks [15](./docs/tasks/15-entity-flow.md) → [16](./docs/tasks/16-slice2-planning-gate.md) → [17](./docs/tasks/17-site-migration.md)) |
| [03 — Catalog](./docs/tasks/01-task-index.md#slice-03--catalog) | Parts, items, vendor pricing | planned |
| [04 — Estimates](./docs/tasks/01-task-index.md#slice-04--estimates) | Sales quotes + line items | planned |
| [05 — Jobs](./docs/tasks/01-task-index.md#slice-05--jobs--change-orders) | BOM explosion, progress, COs | planned |
| [06 — Financial](./docs/tasks/01-task-index.md#slice-06--financial) | Invoices, POs, progress billing | planned |
| [07 — Reports](./docs/tasks/01-task-index.md#slice-07--reports) | Job progress aggregates | planned |

## Recently completed

- **14 — Contact child collections** — `phones`/`emails` on `contact_detail`: hand descriptor in `lib/contacts/descriptors.ts`, repository replace semantics, `PhoneEmailFields` + RHF `useFieldArray` (2026-06-13).
- **13 — Contact UI** — `/contacts` master-detail (`ContactList` + `ContactDetailForm`), `SurfaceToolbar` Save/Delete, React Query hooks wired via `SURFACE_API` (2026-06-13).
- **12 — Contact DAL and API** — `lib/contacts/{descriptors,repository,dal}`, `/api/contacts*` + filtered `/api/customers|vendors|manufacturers`; `party_role` list filter; projection contract test (2026-06-13).
- **11 — Contact surfaces** — seven `modules/contact/*.surface.yaml` + two `modules/employee/*.surface.yaml`, codegen output, `subhubRegistry` wired; L1/L2 logged in latch-feedback (2026-06-13).
- **10 — Party migration** — `016_party.sql` (`party`, `party_role`, `party_phone`, `party_email`, `employee`), `017_party_dev_seed.sql` fixtures; `latch_app` grants (2026-06-13).
- **09 — First-run setup** — `/setup` wizard (`LATCH_SETUP_KEY` + `login_name`), `lib/setup.ts`, auth gates, `login_name` login bridge via `@latch.local` credential suffix (2026-06-13).
- **08 — IAM UI** — `/iam/users` + `/iam/roles` master-detail, `SurfaceToolbar`, React Query hooks, RHF form wrappers, grant matrix (2026-06-13).
- **07 — IAM DAL and API** — `lib/iam/{descriptors,repository,dal}`, `api/iam/users*` + `api/iam/roles*` via `createSurfaceRouteHandlers` (2026-06-13).
- **06 — IAM surfaces** — five `modules/iam/*.surface.yaml`, codegen output, `subhubRegistry` wired (2026-06-13).
- **05 — Nav manifest** — `lib/nav.ts`, `nav-server.ts`, `SideNav` with manifest-filtered groups + `next/link` (2026-06-13).
- **04 — Auth entry** — `/login`, `requireAuth`, Better Auth client, `UserMenu`, session-aware root layout (2026-06-12).
- **03 — App shell layout** — `(public)` / `(private)` route groups, `AppShell`, antd v6 token styling, `/settings` placeholder (2026-06-12).
- **02 — UI dependencies** — antd, RHF, React Query, `AntdRegistry`, `Providers` (2026-06-12).
- Planning session — architecture, decisions, task index, routing/library guidance (2026-06-12).

## Pointers

- [Decisions](./docs/decisions.md) — locked choices (no approval, party model, explicit routes)
- [Architecture](./docs/architecture.md) — data model + surface catalog
- [Routing & libraries](./docs/routing-and-libraries.md) — pages, API, Ant Design, RHF, React Query
- [Child collections](./docs/child-collections.md) — phones, emails, line items on a parent Surface
- [Latch feedback](./docs/latch-feedback.md) — platform gaps discovered while building SubHub
- [Scaffold runbook](../../packages/codegen/docs/scaffold-runbook.md) — migrations, env, codegen
