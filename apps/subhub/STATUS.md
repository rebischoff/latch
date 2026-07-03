# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-02.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migration **036** applied on dev. Tasks **29–36**, **37a**, **37b**, **37c**, **37d**, **37d2**, **37e**, **38**, **39** complete.

## Right now — do this next

**Task 37f — Estimate line costing** — `spec_def` number type, part filter engine, TreeSelect lines. Task: [`37f-estimate-line-costing.md`](./docs/tasks/37f-estimate-line-costing.md) *(TBD)*.

## Blockers

None for 37f start (37d2 complete).

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **Backbone** | Tasks 29–32 — estimate on new schema | **29–32** ✅ |
| **Catalog / scope** | Task 37b apply `033` | **complete** ([37b](./docs/tasks/37b-category-scope-migration-apply.md)) |
| **02 — Sites** | Task 37c scopes & zones DAL/UI | **complete** ([37c](./docs/tasks/37c-site-scopes-zones.md)) |
| **03 — Catalog** | Task 37d2 spec inheritance | **complete** ([37d2](./docs/tasks/37d2-category-spec-inheritance.md)) |
| **04 — Estimates** | Task 37f line costing | **active** — next ([37f](./docs/tasks/37f-estimate-line-costing.md)) |
| **Cross-cutting** | Task 38 master-detail chrome | **complete** ([38](./docs/tasks/38-master-detail-chrome.md)) |
| **Cross-cutting** | Task 39 toolbar chrome slots | **complete** ([39](./docs/tasks/39-toolbar-chrome-slots.md)) |
| **04 — Estimates** | Task 33 site anchor | **complete** ([task 33](./docs/tasks/33-estimate-site-anchor.md)) |
| **04 — Estimates** | Task 37e scope tab | **complete** ([37e](./docs/tasks/37e-estimate-scope-tab.md)) |
| **02 — Sites** | Tasks 34–36 geography UI | **complete** (superseded at DDL by 37a — refactor in 37c ✅) |
| **03 — Catalog** | Wave 3a parts | **complete** ([task 24](./docs/tasks/24-part-wave-3a.md)) |
| **05 — Jobs** | Wave 5a shell | **complete** ([task 23](./docs/tasks/23-job-wave-5a.md)) |

## Estimate / scope finish chain

```text
37a ✅  →  37b ✅  →  37c site ✅  →  37d catalog ✅  →  37e scope tab ✅  →  37d2 spec inheritance ✅  →  37f estimate lines
```

Planning: [`11-categories-scope-model.md`](./docs/planning/11-categories-scope-model.md) · Migration: [`033-category-scope-plan.md`](./docs/migrations/033-category-scope-plan.md) · [`035-estimate-zone-plan.md`](./docs/migrations/035-estimate-zone-plan.md) · [`036-category-spec-exclude-plan.md`](./docs/migrations/036-category-spec-exclude-plan.md)

## Recently completed

- **Task 37d2 — Category spec inheritance** — migration `036_category_spec_exclude.sql`; `effectiveParticipation` / `scopePanelDefs` DAL; inherited + include − exclude UI; estimate scope panel subtree union; PATCH rejects orphan `spec_def_id` (2026-07-02).
- **Task 37e — Estimate scope tab** — migration `035_estimate_zone.sql`; `scopes` + `site_tree` DAL; Scope tab checkboxes + spec panel; line tree scope parents; retired catalog system picker (2026-07-02).
- **Task 39 — Toolbar chrome / category New child fix** — `MasterDetailSelectionContext` + ref-backed `resolveChildParentId`; tree highlight `selectedId ?? selectedFromRoute`; docs amended (2026-07-02).
- **Task 38 — Master-detail chrome** — shared toolbar host + form chrome; route flatten for sites, parts, jobs, estimates, employees, manufacturers, categories; list scaffolding (`SurfaceListTable`, `useSurfaceListSearch`); categories Track B (New dropdown, draft create) (2026-07-01).
- **Task 37d — Category catalog DAL + surfaces** — `category_list` / `category_detail`; tree list pane; spec_def / category_spec_def DAL; `/categories` UI; `GET /api/categories/roots` (2026-07-01).

## Pointers

- [Task 37f — estimate line costing](./docs/tasks/37f-estimate-line-costing.md) *(TBD)*
- [Task 37d2 — category spec inheritance](./docs/tasks/37d2-category-spec-inheritance.md)
- [Task 37e — estimate scope tab](./docs/tasks/37e-estimate-scope-tab.md)
- [Planning 11 — categories scope model](./docs/planning/11-categories-scope-model.md)
- [Migration 036 plan](./docs/migrations/036-category-spec-exclude-plan.md)
- [Migration 035 plan](./docs/migrations/035-estimate-zone-plan.md)
- [Migration 033 plan](./docs/migrations/033-category-scope-plan.md) · [Schema DBML](./docs/schema/current.dbml)
