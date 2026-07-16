# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-16.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**079** applied on dev. Tasks **29–36**, **37a**–**37z**, **37aa**, **37ac**, **37ad**, **37ae**–**37aj**, **38**, **39**, **40**, **41ak**, **41al**, **41am**, **41an**, **41ao**, **42a**, **42b**, **42c**, **43**, **44**, **45**, **46**, **47**, **48**, **50**, **51** complete; **49** ready; **41ab** superseded/reverted by **37ac**; **37h cancelled** (obsolete).

## Right now — do this next

**[49 — Change-order Surfaces (5d)](./docs/tasks/49-change-order-surfaces.md)** — CO Surfaces + Approve on [45](./docs/tasks/45-job-costing-and-change-order-reconciliation.md) DAL.

## Blockers

- _(none)_

## Parked (needs product discussion)

- **[17 — Service / warranty / T&M](./docs/planning/17-service-warranty-tm-open.md)** — SW0 blank-job Add condition; SW1–SW5 T&M, fixed service, ticket fields. JC1–JC2 stay locked; do not implement until session.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **03 — Catalog** | Spec participation removal (namespace narrowing + wildcard matching) | **37ai complete** (2026-07-12) |
| **04 — Estimates** | Site warn-and-clear (S1–S9) | **44 complete** (2026-07-14) |
| **05 — Jobs** | **5b + 47–51 complete**; **49** ready (5d) | Field progress shipped (2026-07-16) |

## Recently completed

- **51 — Field progress (5c)** — `job_field_progress_cell` + `field_progress`; hours-weighted % + lifecycle; Field tab persist; cancel-at-0%; migration **079** (2026-07-16).
- **51 authored — Field progress (5c)** — Ready; F1–F9 + stale 30d + cancel-at-0%; parallel with 49 (2026-07-16).
- **5c Field progress — product locked (F1–F9)** — boolean zone×phase; General; hours-weighted derived %; lifecycle; no history / no Complete in-wave; planning [18](./docs/planning/18-job-field-progress.md) (2026-07-16).
- **Parked open discussion — service / warranty / T&M** — planning [17](./docs/planning/17-service-warranty-tm-open.md) (SW0–SW5); decisions index Open row (2026-07-15).
- **50 — Job Scope editable on create** — create POST nested `conditions` / `line_items`; Scope tab after site pick (estimate parity); site warn-and-clear clears both collections (2026-07-15).
- **JC1–JC7 locked + tasks 48/49 authored** — as-sold via estimate Win; Jobs New kept; CO = separate Surfaces + shared helpers; complexity drift; mid-job progress retention; planning [16](./docs/planning/16-estimate-job-co-boundaries.md) (2026-07-15).
- **47 — Job LI parity (JLI-1…7)** — migration **077** `sold_quantity`; win seeds dual qty; working qty editable; Item RO + Part Select; zone icon + job unplaced danger; Scope-F1 amended; contract rollup × sold qty (2026-07-15).
- **47 authored — Job LI parity (JLI-1…7)** — dual `sold_quantity` / working qty; remove Sold badge; Item RO + Part editable; zone icon + job danger; Scope-F1 amend; task ready (2026-07-15).
- **46 — Estimate win / lose → job copy (5b thick)** — migration **076**; win/lose/recreate DAL; Win/Lose/Create-job actions; job_condition* + sold snapshots + allocations; estimate-parity Job Scope (Scope-U1/E1/F1/S1) (2026-07-15).
- **46 Scope UI locks (Scope-U1/E1/F1/S1)** — estimate-parity Job Scope; add @ $0 / delete $0 only; freeze sold$/qty/description; job shell + shared helpers; task 46 Step 5 rewritten (2026-07-15).
- **46 decisions locked + task authored — estimate win → job (5b thick)** — one job per catalog scope (S2a); editable job conditions + sold vs current costing; place allocations; Win/Lose actions; 37h cancelled as obsolete (2026-07-15).
- **45 — Job costing + CO/BOM/scope-phase reconciliation** — migration **075** (`job_line_cost_revision`, CO/BOM/`scope_phase` DDL, conditional `material_receipt_line.unit_cost`); re-budget DAL; `approveChangeOrder` C4–C6; job cost summary on Overview; CO approve guard alert for 5d (2026-07-14).
- **45 decisions locked — job costing + CO/BOM/scope-phase reconciliation** — budget/committed/actual(material)/margin as DAL rollups; new `job_line_cost_revision` re-budget entity distinct from change orders; CO `deduct`/`revise` reconciles `job_line_part` + `scope_phase` (block on committed material, warn + carry-forward completed qty); new `decisions/costing.md`; task authored (2026-07-14).
- **44 — Site warn-and-clear** — drop `site_id` immutability; confirm clears conditions/lines; estimate + job `LinkedSelect` parity; estimate requires empty collections on site change; job auto-clears lines (2026-07-14).
- **44 decisions locked (S1–S9) — site warn-and-clear** — supersedes immutable-after-create; confirm clears conditions/lines; job parity + `estimate_id` freeze; task authored (2026-07-14).
- **43 — Condition labor only + Y4 discontinued** — `labor_only` commercial mode; force M/F/I = 0; clear part; Y4 UI for labor-only + discontinued; migration **074** (2026-07-14).
- **43 decisions locked (L1–L12) — labor only + Y4 discontinued** — condition commercial mode; force M/F/I = 0; clear part; Y4 storage/UI; same-task discontinued inherit fix; task authored (2026-07-14).
- **42c — Line Items zone tree popover** — checkable root-scoped tree; cascade + parent bulk qty; leaf-only allocations; exclusive qty ↔ places (amends G3/X3); no schema (2026-07-14).
- **42b — Estimate condition ↔ site zone link** — root conditions FK to root `site_zone`; drop stored `root_item_id`; Add-root zone picker + New…; Line Items zone icon before Qty; migration **073** (2026-07-14).
- **42a — Site zone tree unification** — collapsed `site_scope`+`site_zone` into one self-referencing `site_zone` tree; migration **072**; root-delete blocked while children exist (2026-07-14).
- **42a/42b authored — site/estimate zone unification** — unify `site_scope`+`site_zone` into one tree; bind estimate root conditions to a root site zone (hybrid link); Line Items zone icon replaces Places column; asset-level history explicitly deferred (2026-07-14).
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

- [Task 49 — CO Surfaces (5d)](./docs/tasks/49-change-order-surfaces.md) ← **do next**
- [Task 51 — Field progress (5c)](./docs/tasks/51-job-field-progress.md) ✅
- [Planning 18 — Field progress 5c](./docs/planning/18-job-field-progress.md) ✅
- [Decision — Field progress F1–F9](./docs/decisions/job.md#decision-job-field-progress--boolean-zone-snapshot-5c-2026-07-16)
- [Task 48 — front doors + complexity drift](./docs/tasks/48-job-create-front-doors-condition-drift.md) ✅
- [Decision — JC1–JC7 commercial boundaries](./docs/decisions/job.md#decision-estimate--job--co-commercial-boundaries-2026-07-15)
- [Planning 16 — estimate/job/CO boundaries](./docs/planning/16-estimate-job-co-boundaries.md)
- [Task 47 — Job LI parity (JLI)](./docs/tasks/47-job-line-items-parity.md) ✅
- [Task 46 — estimate win → job (5b thick)](./docs/tasks/46-estimate-win-lose-job-copy.md) ✅
- [Decision — estimate win → job handoff (W0–W7)](./docs/decisions/estimate.md#decision-estimate-win--job-handoff-2026-07-14)
- [Task 45 — job costing + CO/BOM/scope-phase reconciliation](./docs/tasks/45-job-costing-and-change-order-reconciliation.md) ✅
- [Decision — job costing layers + re-budget](./docs/decisions/costing.md)
- [Decision — CO/BOM/scope_phase reconciliation](./docs/decisions/job.md#decision-change-order--bom-and-scope-phase-reconciliation-2026-07-14)
- [Task 37h — job FK renames](./docs/tasks/37a-category-scope-decision-dbml-migration.md) — **cancelled** (obsolete)
- [Task 44 — site warn-and-clear](./docs/tasks/44-site-anchor-warn-and-clear.md) ✅
- [Decision — site warn-and-clear (S1–S9)](./docs/decisions/estimate.md#decision-estimate--job-site-anchor--warn-and-clear-not-immutable-2026-07-14)
- [Task 43 — labor only + Y4 discontinued](./docs/tasks/43-estimate-labor-only.md) ✅
- [Decision — labor only (L1–L12)](./docs/decisions/estimate.md#decision-condition-labor-only--y4-discontinued-2026-07-14)
- [Task 42c — zone tree popover](./docs/tasks/42c-estimate-line-zone-tree-popover.md) ✅
- [Task 42b — estimate condition zone link](./docs/tasks/42b-estimate-condition-zone-link.md) ✅
- [Task 42a — site zone tree unification](./docs/tasks/42a-site-zone-tree-unification.md) ✅
- [Planning — site/estimate zone unification](./docs/planning/14-site-estimate-zone-unification.md)
- [Task 41ao — drop threshold presets](./docs/tasks/41ao-drop-threshold-presets.md) ✅
- [Task 41am — part boolean spec Select](./docs/tasks/41am-part-boolean-spec-select.md) ✅
- [Task 41al — boolean spec Select (C panel)](./docs/tasks/41al-estimate-boolean-spec-select.md) ✅
- [Task 41ak — part discontinued filter](./docs/tasks/41ak-part-discontinued-filter.md) ✅
- [Decision — discontinued filter (W2b)](./docs/decisions/estimate.md#w2b--discontinued-part-filter-locked-2026-07-13)
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
