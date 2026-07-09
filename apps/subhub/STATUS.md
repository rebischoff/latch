# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-08.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**053** authored. Tasks **29–36**, **37a**–**37u**, **37v**, **37w**, **38**, **39** complete.

## Right now — do this next

**Jobs slice:** [37h](./docs/tasks/37a-category-scope-decision-dbml-migration.md) — job `site_zone_id` FK renames ([37a chain](./docs/tasks/37a-category-scope-decision-dbml-migration.md)).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **03 — Catalog** | Spec types epic | **37t complete** — type round-trip preserves Details before save |
| **04 — Estimates** | Line Items panels | **37w complete** — three-panel S / C / LI layout shipped |
| **05 — Jobs** | 5b+ / 37h | After smoke — win/lose, field status, change orders; `site_zone_id` FK renames |

## Recently completed

- **37w — Line Items three-panel layout** — S select-only tree + C bucket config + LI flat grid; implicit include; 37v tree UI retired; build + tests green (2026-07-08).
- **37w decisions W1–W9 locked** — three-panel Line Items; desktop-only v1; ready for implementation (2026-07-08).
- **37w W6 — LI flat grid** — 37f columns; Add line = FieldArrayTable dashed footer button (2026-07-08).
- **37w W5 — S selection only** — no add/remove scope UI; implicit include on line/config; W2 amended to full site tree (2026-07-08).
- **37w W4 — C panel config** — complexity, labor phases multi-select, specs; popover retired (2026-07-08).
- **37w W2–W3 — S panel + LI filter** — site-shaped select-only tree; scope = unzoned lines; drag retarget deferred (2026-07-08).
- **37w W1 — Line Items three-panel shell** — decision locked: S+C left rail, LI flat right; supersedes 37v tree UI (2026-07-08).
- **Task 37v — Line Items tab merges Scope config** — Add scope/zone dropdowns, Configure popover on parent rows, kit UI removed, Scope tab retired; unit tests + build green (2026-07-08).
- **Task 37t — Spec def type round-trip** — Approach B: no eager Type clears; `toSpecDefinitionPatchRow` strips invalid cross-type fields at PATCH; unit tests (2026-07-08).
- **Task 37u — Part leaf-only item links + Specs value UX** — `loadOrgItemTree` leaf-only; DAL `not_leaf_item`; multi TreeSelect; Spec · Value (checkbox / number popover / enum); migration `053`; docs amended (2026-07-08).

## Pointers

- [Task 37w — Line Items three-panel layout](./docs/tasks/37w-estimate-line-items-panels.md) ✅
- [Task 37t — type round-trip](./docs/tasks/37t-spec-def-type-roundtrip.md) ✅
- [Task 37u — part leaf links + Specs UX](./docs/tasks/37u-part-leaf-links-specs-ui.md) ✅
- [Decision — part leaf-only + Specs value UX](./docs/decisions/catalog.md#decision-part-item-links-leaf-only--specs-value-ux-2026-07-08)
- [Task 37s — drop `range` + Specs Details](./docs/tasks/37s-spec-defs-ui-drop-range.md) ✅
- [Schema DBML](./docs/schema/current.dbml)
