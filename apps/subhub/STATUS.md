# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-13.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**071** applied on dev. Tasks **29–36**, **37a**–**37z**, **37aa**, **37ac**, **37ad**, **37ae**–**37aj**, **38**, **39**, **40**, **41ak**, **41al**, **41am**, **41an**, **41ao** complete; **41ab** superseded/reverted by **37ac**.

## Right now — do this next

**[37h — Job FK renames](./docs/tasks/37a-category-scope-decision-dbml-migration.md)** — rename job FKs per category-scope decision.

## Blockers

- _(none)_

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **03 — Catalog** | Spec participation removal (namespace narrowing + wildcard matching) | **37ai complete** (2026-07-12) |
| **04 — Estimates** | Part Select UX + discontinued filter (walkthrough W1/W2a/W2b) | **41ak complete** (2026-07-13) |
| **05 — Jobs** | 5b+ / 37h | Unresolved pool (G4) later; FK renames next |

## Recently completed

- **41ao — Drop threshold presets + number popover** — removed preset tables/FKs/UI/matcher; shared `SpecNumberValuePopover`; migration **071** (2026-07-13).
- **41am — Part boolean spec Select** — Part Specs tab boolean defs use `Select` (True / False, allowClear → omit row / N/A) instead of Checkbox (2026-07-13).
- **41an — Candela Low/High** — enum options Low|High only; rewrote seeds 062/065/066/068; forward migration 070; strobe parts seeded Low (2026-07-13).
- **41al — Boolean spec Select (C panel)** — Low Frequency and other boolean defs use `Select` (True / False, allowClear → null) instead of Switch (2026-07-13).
- **41ak — Part discontinued filter** — `manufacturer_part.discontinued`; C panel **Include discontinued**; shared resolver/picker/preview filter (2026-07-13).
- **40 — Detail tab persistence** — URL `?tab=` + `buildDetailHref` + availability fallback on jobs/sites/estimates/parts/items (2026-07-13).
- **40 decision locked — detail tab persistence** — URL `?tab=`; same-surface preserve + availability fallback; task authored (2026-07-13).
- **37aj — Estimate Part Select + catalog seed parity** — always-Select Part column; `POST` parts picker with draft bucket; migration **067** Ceiling/Outdoor `part_item` parity from Wall (2026-07-13).
- **W2a locked — Part column always Select** — empty OK; options = all matches; pick → `material_locked`; task **37aj** authored (2026-07-13).
- **W1 locked — costing triggers** — keep P2/P3; walkthrough started (2026-07-13).
- **37ai — Spec participation removal (V1–V8)** — dropped `item_spec_participation`; `rootNamespaceForItems` replaces participation union; matcher wildcard-on-absence; leaf item detail has no spec Field; migration `064` applied (2026-07-12).
- **37ai decision + docs locked (V1–V8)** — `item_spec_participation` dropped outright (not re-shaped); item narrowing = scope-root namespace; part-row absence on an in-namespace def is a wildcard match, not a failure; migration `064` drafted (gated on DAL landing first); task authored (2026-07-12).
- **37ah — Spec threshold presets estimate C panel UI** — *(historical)* preset chips; superseded by **41ao** (2026-07-12).
- **37ag — Spec threshold presets matcher + bucket DAL** — *(historical)* preset expansion; numeric interval overlap retained by **41ao** (2026-07-12).
- **37af — Spec threshold presets catalog UI** — *(historical)*; superseded by **41ao** (2026-07-12).
- **37ae — Spec threshold presets DDL** — *(historical)*; dropped by migration **071** / **41ao** (2026-07-12).
- **Threshold presets decision locked (A1–T10)** — **superseded by 41ao** (numeric ranges retained) (2026-07-12).
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

- [Task 41ao — drop threshold presets](./docs/tasks/41ao-drop-threshold-presets.md) ✅
- [Task 41am — part boolean spec Select](./docs/tasks/41am-part-boolean-spec-select.md) ✅
- [Task 41al — boolean spec Select (C panel)](./docs/tasks/41al-estimate-boolean-spec-select.md) ✅
- [Task 41ak — part discontinued filter](./docs/tasks/41ak-part-discontinued-filter.md) ✅
- [Decision — discontinued filter (W2b)](./docs/decisions/estimate.md#w2b--discontinued-part-filter-locked-2026-07-13)
- [Task 37h — job FK renames](./docs/tasks/37a-category-scope-decision-dbml-migration.md) ← **next**
- [Task 40 — detail tab persistence](./docs/tasks/40-detail-tab-persistence.md) ✅
- [Decision — detail tab persistence](./docs/decisions/general.md#decision-detail-tab-persistence--url-tab--availability-fallback-2026-07-13)
- [Task 37aj — Part Select + seed parity](./docs/tasks/37aj-estimate-part-select-and-seed.md) ✅
- [Decision — line item pick walkthrough (W1, W2a)](./docs/decisions/estimate.md#decision-line-item-pick--costing-walkthrough-2026-07-13)
- [Task 37ai — spec participation removal](./docs/tasks/37ai-spec-participation-removal.md) ✅
- [Decision — threshold presets + bucket ranges (A1–T10)](./docs/decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12) — **superseded by 41ao**
- [Task 37ad — labor phase per-row override](./docs/tasks/37ad-labor-phase-per-row-override.md) ✅
- [Decision — labor phase per-row override](./docs/decisions/catalog.md#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12)
- [Task 37ac — revert placement + mount axis](./docs/tasks/37ac-item-placement-mount-axis-revert.md) ✅
- [Task 37ab — placement + mount axis](./docs/tasks/37ab-item-placement-mount-axis.md) — **superseded/reverted**, historical only
- [Task 37aa — line live preview + dual locks](./docs/tasks/37aa-estimate-line-live-preview.md) ✅
