# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-29.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** **Estimate finish track** — tasks **29–32** complete (backbone + 4e shipped). **Next:** estimate wave **4c′** (`estimate_area` DDL + area parent rows) or **4b** (win → job). Task **25** manufacturer stop gate **paused** (not blocking).

## Right now — do this next

**Estimate wave 4c′** — quote geography (`estimate_area` DDL, area parent rows in tree editor, `estimate_area_id` on lines, Import from site). Planning: [`02-estimates.md`](./docs/planning/02-estimates.md) · prior work: [task 32](./docs/tasks/32-estimate-wave-4e.md) ✅.

**Alternate track:** wave **4b** — `win`/`lose` → job copy + reconcile quote areas → `site_area`. No task file yet.

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **Backbone** | Tasks 29–32 — estimate on new schema | **29–32** ✅ |
| **04 — Estimates** | Wave 4e backbone alignment | **complete** ([task 32](./docs/tasks/32-estimate-wave-4e.md)) |
| **04 — Estimates** | Wave 4c′ quote geography | **next** (no task file yet) |
| **04 — Estimates** | Wave 4b win → job | planned |
| **03 — Catalog** | Wave 3a parts | **complete** ([task 24](./docs/tasks/24-part-wave-3a.md)); 3b `item_*` after estimate 4e |
| **03 — Catalog** | Task 25 manufacturer | **paused** — resume after 4c′/4b or parallel |
| **05 — Jobs** | Wave 5a shell | **complete** ([task 23](./docs/tasks/23-job-wave-5a.md)) |
| [02 — Sites](./docs/tasks/01-task-index.md#task-20--ui-discovery) | Sites CRM slice | complete (legacy geography DDL) |

## Estimate finish chain

```text
29 DBML pass ✅  →  30 surfaces review ✅  →  31 migrations + seeds ✅  →  32 estimate 4e ✅  →  4c′ / 4b
```

Planning source: [`planning/09-migration-notes.md`](./docs/planning/09-migration-notes.md) — formalized as tasks **29–32**.

## Recently completed

- **Task 32 — Estimate wave 4e (stop gate)** — tree line editor (`EstimateLineTreeTable`); `systems` + nested specs; backbone `line_items`; job line DAL `site_area_id`/`site_asset_id`; `codegen:check` + build pass (2026-06-29).
- **Task 32 step 7 — System specs in expanded row** — `EstimateSystemSpecFields` (enum/boolean/text); specs child row in tree table; catalog picker + GET include spec def options (2026-06-29).
- **Task 32 step 6 — Tree line editor UI** — `EstimateLineTreeTable` + `estimate-line-tree.ts` helpers; catalog system picker API; `EstimateDetailForm` wires `systems` + backbone `line_items` PATCH (2026-06-29).
- **Task 32 step 5 — Job line DAL** — `job-lines*` + `job-detail` descriptor: `site_area_id` / `site_asset_id`; dropped `site_location` references (2026-06-29).
- **Task 32 step 4 — Estimate DAL write** — `estimate-systems-write.ts` replace-array + nested specs; `estimate-lines-write.ts` backbone columns; `replaceEstimateCollectionsTx` orchestrates systems → lines in one transaction (2026-06-29). — shipped + applied `028`–`031` (catalog `system`/specs/phase templates, site as-built rename + backfill, `estimate_system` + spec tables, agreed dev seeds) to dev DB; legacy `site_section`/`site_location`/`estimate_section` dropped (2026-06-29).
- **Task 30 — Backbone surfaces review** — impact matrix, `codegen:check` pass, schema README coverage refresh; estimate path to 32 confirmed (2026-06-29).
- **Task 29 — Backbone DBML pass** — `current.dbml` amended per planning/09-migration-notes (site_area/asset, estimate_system, scope_phase, catalog system/specs); task file + index (2026-06-29).
- **Task 28 — Employee detail (stop gate)** — provision retrofit verified; `codegen:check` passed (2026-06-25).
- **Task 23 — job wave 5a** — job shell + Overview (2026-06-24).
- **Task 22 — estimate wave 4a** — flat production `/estimates` on legacy schema (2026-06-23).

## Pointers

- [Task 32 — estimate 4e](./docs/tasks/32-estimate-wave-4e.md) · [Task 31 — migrations](./docs/tasks/31-estimate-backbone-migrations.md)
- [Task 30 — surfaces review](./docs/tasks/30-backbone-surfaces-review.md) · [Task 29 — DBML pass](./docs/tasks/29-backbone-dbml-pass.md)
- [Planning 09-migration-notes](./docs/planning/09-migration-notes.md) · [Planning 02-estimates](./docs/planning/02-estimates.md)
- [Estimate spec](./docs/surface-specs/estimate.md) · [Schema DBML](./docs/schema/current.dbml)
- [Task 25 — manufacturer](./docs/tasks/25-manufacturer-detail.md) (paused)
