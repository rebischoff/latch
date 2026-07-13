# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-12.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**064** applied on dev. Tasks **29–36**, **37a**–**37z**, **37aa**, **37ac**, **37ad**, **37ae**–**37ai**, **38**, **39** complete; **37ab** superseded/reverted by **37ac**.

## Right now — do this next

**[37h — job `site_zone_id` FK renames](./docs/tasks/37a-category-scope-decision-dbml-migration.md)** — category/scope decision DBML + migration chain queued behind **37ai** (now complete). See [01-task-index](./docs/tasks/01-task-index.md#category-scope--tasks-37a37h).

## Blockers

- _(none)_

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **03 — Catalog** | Spec participation removal (namespace narrowing + wildcard matching) | **37ai complete** (2026-07-12) |
| **04 — Estimates** | Live line preview + dual locks | **37aa** + C panel presets **37ah** complete |
| **05 — Jobs** | 5b+ / 37h | Unresolved pool (G4) later; FK renames |

## Recently completed

- **37ai — Spec participation removal (V1–V8)** — dropped `item_spec_participation`; `rootNamespaceForItems` replaces participation union; matcher wildcard-on-absence; leaf item detail has no spec Field; migration `064` applied (2026-07-12).
- **37ai decision + docs locked (V1–V8)** — `item_spec_participation` dropped outright (not re-shaped); item narrowing = scope-root namespace; part-row absence on an in-namespace def is a wildcard match, not a failure; migration `064` drafted (gated on DAL landing first); task authored (2026-07-12).
- **37ah — Spec threshold presets estimate C panel UI** — preset chips + Custom enum/range controls; spec templates hydrate `presets[]`; migration 062 Candela smoke seed (2026-07-12).
- **37ag — Spec threshold presets matcher + bucket DAL** — migration 061 point normalize; `spec-match.ts` interval overlap + enum preset sets; bucket load/write for `value_number_max` / `spec_threshold_preset_id`; `presets[]` on estimate spec rows; line-spec write parity (2026-07-12).
- **37af — Spec threshold presets catalog UI** — `presets[]` on scope `spec_definitions` DTO; DAL diff-upsert + delete guards; Details popover authoring for enum sets + number min/max (2026-07-12).
- **37ae — Spec threshold presets DDL** — `spec_threshold_preset` + junction; `spec_threshold_preset_id` on bucket rows; `value_number_max` activated in DBML; migration 060 (2026-07-12).
- **Threshold presets decision locked (A1–T10)** — presets edited on scope Specs Details popover; numeric interval overlap + enum option-set presets; tasks **37ae**–**37ah** authored (2026-07-12).
- **37ad — Labor phase per-row override** — shared ancestry merge helper; `resolved_labor_phase` DTO + per-row inherit/Override UI; costing + catalog agree (2026-07-12).
- **37ad decision locked (per-row labor override)** — labor phase resolution merges per `labor_phase_id` across the full ancestry walk instead of atomic-group swap; explicit exclusion = own `0`-hours row, no schema change; task authored (2026-07-12).
- **37ac — Revert item placement + mount axis** — dropped `item_placement`/`item_cost_override`/`commercial_axis`/variant/`implies`; migration 058; `resolveRate` back to D4 (2026-07-11).
- **37ab reverted** — item placement + mount axis override (M1–M7, L1–L6) superseded same-day by leaf-duplication decision (R1–R6); revert tracked as **37ac** (2026-07-11).
- **37ab Steps 1–3** *(historical, reverted)* — placement + commercial axis (migration/DAL + catalog UI); picker decode without seed (2026-07-11).
- **37aa — Estimate line live preview + dual locks** — `sales_locked` / `material_locked`; migration 056; server batch preview on item/part/config (2026-07-11).
- **37aa decisions locked (P1–P7)** — dual locks + live preview; task authored (2026-07-11).
- **37z — Item commercial inherit UI** — F/I/M on all nodes; child inherit checkbox; no schema change (Z1–Z5) (2026-07-09).
- **37y — Condition-only commercial tree** — drop `estimate_scope`; lines require condition; C inherit checkbox (Y1–Y5) (2026-07-09).
- **Y1–Y5 locked — condition-only commercial tree** — drop `estimate_scope`; lines require condition; C inherit checkbox; author 37y (2026-07-09).
- **37x — Estimate conditions + allocations** — commercial tree; complexity on condition only; Places/allocations + `qty_manual` (2026-07-09).
- **X1–X4 locked** — block delete; estimate-owned tree (names in C); `qty_manual`; 37x = estimate path only (2026-07-09).
- **G5e locked — D5/D3/D6g/DBML package** — complexity on condition only; author 37x (2026-07-09).
- **G5a–G5d locked** — `estimate_condition`; allocations; S = commercial tree; C binds scope/condition (2026-07-09).
- **Decision G1–G4 — scope / condition / zone / qty** — product meaning locked (2026-07-09).
- **37w — Line Items three-panel layout** — topology retained; S/C content superseded by 37x/37y (2026-07-08).

## Pointers

- [Task 37h — job FK renames](./docs/tasks/37a-category-scope-decision-dbml-migration.md) ← **next** (chain)
- [Task 37ai — spec participation removal](./docs/tasks/37ai-spec-participation-removal.md) ✅
- [Task 37ag — matcher + bucket DAL](./docs/tasks/37ag-spec-threshold-presets-matcher.md) ✅
- [Task 37af — catalog preset UI](./docs/tasks/37af-spec-threshold-presets-catalog-ui.md) ✅
- [Decision — threshold presets + bucket ranges (A1–T10)](./docs/decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12)
- [Task 37ad — labor phase per-row override](./docs/tasks/37ad-labor-phase-per-row-override.md) ✅
- [Decision — labor phase per-row override](./docs/decisions/catalog.md#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12)
- [Task 37ac — revert placement + mount axis](./docs/tasks/37ac-item-placement-mount-axis-revert.md) ✅
- [Task 37ab — placement + mount axis](./docs/tasks/37ab-item-placement-mount-axis.md) — **superseded/reverted**, historical only
- [Task 37aa — line live preview + dual locks](./docs/tasks/37aa-estimate-line-live-preview.md) ✅
- [Decision — dual locks + live preview (P1–P7)](./docs/decisions/estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11)
- [Task 37z — item commercial inherit UI](./docs/tasks/37z-item-commercial-inherit-ui.md) ✅
- [Task 37y — condition-only commercial tree](./docs/tasks/37y-condition-only-commercial-tree.md) ✅
- [Decision — condition-only tree (Y1–Y5)](./docs/decisions/estimate.md#decision-condition-only-commercial-tree-2026-07-09)
- [Task 37x — conditions + allocations](./docs/tasks/37x-estimate-conditions-allocations.md) ✅ (roots superseded by 37y)
- [Schema DBML](./docs/schema/current.dbml)
