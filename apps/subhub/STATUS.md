# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-04.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**039** applied on dev. Tasks **29–36**, **37a**–**37f**, **38**, **39** complete.

## Right now — do this next

**Task 37g — Commercial costing** — **plan complete** (2026-07-04); implement migration **040** + catalog surfaces + `resolveCommercial` recalc. Task: [`37g-commercial-costing.md`](./docs/tasks/37g-commercial-costing.md) · Migration: [`040-commercial-costing-plan.md`](./docs/migrations/040-commercial-costing-plan.md).

## Blockers

None for 37g start. **37f manual smoke #5–#7** deferred until dev catalog seed + line UX follow-up ([findings](./docs/tasks/37f-estimate-line-costing.md#manual-smoke-results-2026-07-04)).

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **04 — Estimates** | Task 37g commercial costing | **active** — next ([37g](./docs/tasks/37g-commercial-costing.md)) |
| **04 — Estimates** | Task 37f line costing | **complete** ([37f](./docs/tasks/37f-estimate-line-costing.md)) |
| **04 — Estimates** | Task 33 site anchor | **complete** ([task 33](./docs/tasks/33-estimate-site-anchor.md)) |
| **04 — Estimates** | Task 37e scope tab | **complete** ([37e](./docs/tasks/37e-estimate-scope-tab.md)) |
| **03 — Catalog** | Task 37d2 spec inheritance | **complete** — superseded by 37d3 ([37d2](./docs/tasks/37d2-category-spec-inheritance.md)) |
| **02 — Sites** | Tasks 34–36 geography UI | **complete** (superseded at DDL by 37a — refactor in 37c ✅) |
| **03 — Catalog** | Wave 3a parts | **complete** ([task 24](./docs/tasks/24-part-wave-3a.md)) |
| **05 — Jobs** | Wave 5a shell | **complete** ([task 23](./docs/tasks/23-job-wave-5a.md)) |

## Estimate / scope finish chain

```text
37a ✅  →  37b ✅  →  37c site ✅  →  37d catalog ✅  →  37e scope tab ✅  →  37d2 tables ✅  →  37d3 assign-once ✅  →  37d4 visibility ✅  →  37d5 owner column ✅  →  37f estimate lines
```

Planning: [`11-categories-scope-model.md`](./docs/planning/11-categories-scope-model.md) · Migrations: [`036-category-spec-exclude-plan.md`](./docs/migrations/036-category-spec-exclude-plan.md) · [`037-category-spec-assign-once-plan.md`](./docs/migrations/037-category-spec-assign-once-plan.md) · [`038-category-spec-owner-column-plan.md`](./docs/migrations/038-category-spec-owner-column-plan.md)

## Recently completed

- **Task 37f — Estimate line costing** — migration `039`; retire General scope; part resolver + item/part pickers; zone line parents; material snapshot + `unit_price_target`; scope-required gating. Manual smoke 1–4 + 8A–8B pass; #5–#7 blocked (no dev items) — [findings](./docs/tasks/37f-estimate-line-costing.md#manual-smoke-results-2026-07-04) (2026-07-04).
- **Task 37d5 — Spec owner column** — migration `038`; `spec_def.category_id` owner column replaces `category_spec_def` (dropped) + `spec_def.root_category_id`; namespace derived from tree; participation write reduced to exclude-only; algorithms unchanged (2026-07-04).
- **Task 37d4 — Category spec visibility** — owner-branch knowledge filter on GET; owner-only def PATCH; category UI edit at owner / read-only inherited (2026-07-04).
- **Task 37d3 — Assign-once participation** — migration `037`; assign-once resolver; participates checkbox UI; PATCH `participates[]` (2026-07-03).
- **Decision — assign-once participation (2026-07-03)** — supersedes 37d2 delta algorithm/UI; task [37d3](./docs/tasks/37d3-category-spec-participation-simplify.md) stubbed; DBML + surface spec amended.
- **Task 37d2 — Category spec inheritance** — migration `036`; delta participation DAL/UI; scope panel union (2026-07-02).
- **Task 37e — Estimate scope tab** — migration `035`; Scope tab + line tree scope parents (2026-07-02).

## Pointers

- [Task 37f — estimate line costing](./docs/tasks/37f-estimate-line-costing.md)
- [Task 37g — commercial costing](./docs/tasks/37g-commercial-costing.md)
- [Decision — commercial costing (2026-07-04)](./docs/decisions/catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04)
- [Decision — scope required (2026-07-04)](./docs/decisions/estimate.md#decision-estimate-scope-required--pricing-overrides-2026-07-04)
- [Task 37d4 — spec visibility](./docs/tasks/37d4-category-spec-visibility.md)
- [Decision — owner-branch knowledge](./docs/decisions/catalog.md#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03)
- [Migration 037 plan](./docs/migrations/037-category-spec-assign-once-plan.md)
- [Schema DBML](./docs/schema/current.dbml)
