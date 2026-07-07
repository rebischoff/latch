# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-06.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**044** applied on dev. Tasks **29–36**, **37a**–**37g**, **37i**–**37l**, **38**, **39** complete.

## Right now — do this next

**Optional:** [Task 37f — estimate line costing](./docs/tasks/37f-estimate-line-costing.md) manual smoke #5–#7 (part filter + costing after leaf-quotable model).

**Optional:** [Task 37l](./docs/tasks/37l-leaf-quotable-item-model.md) manual smoke #1–#4 on dev (catalog role gating + estimate leaf picker).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **03 — Catalog** | Tasks 37j / 37k / **37l** | **complete** |
| **04 — Estimates** | Tasks 37f / 37g / 37i / **37l** | **complete**; line smoke optional |

## Recently completed

- **Task 37l — Leaf-quotable item model** — migration `044` + `item.node_type`; DAL guards I2–I5; `resolveRate` self→ancestry (drop `descendantMax`); leaf-only estimate picker; catalog form gated by role; ROM allowance seed; tests + `codegen:check` + build green (2026-07-06).
- **Task 37k — Part spec lifecycle** — prune `manufacturer_part_spec` on `item_links` replace; diff `spec_option` writes with `spec_option_in_use` guard; part form warnings + item save error UX; tests + `codegen:check` + build green (2026-07-06).
- **Task 37g — Commercial costing 040b** — migration `040b`; org catalog tables + `resolveRate` engine; item Commercial UI (`ItemCommercialFields`); scope/zone complexity pickers; line costing columns + lock cycle; DBML/docs pass; full test suite (278 tests) + stop gate closed (2026-07-06).

## Pointers

- [Task 37l — leaf-quotable item model](./docs/tasks/37l-leaf-quotable-item-model.md) ✅
- [Task 37k — part spec lifecycle](./docs/tasks/37k-part-spec-lifecycle.md) ✅
- [Task 37j — catalog part authoring](./docs/tasks/37j-catalog-part-authoring.md)
- [Task 37f — estimate line costing](./docs/tasks/37f-estimate-line-costing.md)
- [Task 37g — commercial costing](./docs/tasks/37g-commercial-costing.md)
- [Migration 040b plan](./docs/migrations/040-commercial-costing-plan.md)
- [Schema DBML](./docs/schema/current.dbml)
