# Spike — estimate line editor

> **Status:** Runnable (2026-06-22); spec locked (2026-06-23). **Task:** [20-ui-discovery](../tasks/20-ui-discovery.md) step 3 ✅. **Implement spec:** [`estimate.md`](../surface-specs/estimate.md).
>
> **Route:** [`/estimates/demo`](http://localhost:3003/estimates/demo) (dev or `LATCH_DEV_PLAYGROUND=1` only; `id` must be `demo`).

## Goal

Clickable `estimate_detail` prototype using **fixture DTO** — answer line-editor layout questions before writing `estimate.md` implement spec.

| Topic | Catalog ref | Spike exercises |
|-------|-------------|-----------------|
| Flat line grid | [O3 flat mode](../decisions/estimate.md) | Single table; add/edit/remove; description, qty, unit, cost, sell |
| Grouped by place | [O3 grouped mode](../decisions/estimate.md) | Collapse panels keyed by `site_location_id` |
| Line kinds | DBML `line_kind` | Product vs labor row shape; `phase_id` column on labor only |
| Kits | `parent_line_id` / `line_role` | Header + component rows with indent; cascade delete on kit header |
| Pickers | Deferred catalog | Static `Select` for `part_id`; item labels documented, not wired |

**Not in spike:** Win → job, snapshots persistence, `estimate_party`, `quote_sections`, pricing engine, catalog migrations.

## Fixture

| File | Role |
|------|------|
| [`components/estimates/estimate-spike-fixtures.ts`](../../components/estimates/estimate-spike-fixtures.ts) | `DEMO_ESTIMATE`, locations, fire-alarm trade lines, static part/phase options |
| [`components/estimates/EstimateLineEditorSpike.tsx`](../../components/estimates/EstimateLineEditorSpike.tsx) | Flat/grouped toggle, line grid, Save/Revert (console log — no API) |

**Fixture quote:** “Fire alarm — Building A tenant improvement” at 1200 Commerce Dr with horn/strobes, pull stations, FACP kit (header + cable + labor), prewire labor, exterior smoke.

**Route choice:** `/estimates/demo` — production URL shape; only `demo` id accepted until DAL ships. Gated like form playground (`NODE_ENV=development` or `LATCH_DEV_PLAYGROUND=1`).

## Questions this spike must answer

- [x] **Flat vs grouped** — both implemented; Segmented toggle on same `line_items` array
- [x] **Column set** — kind, description, part (product), phase (labor), qty, unit, cost, sell, ext sell; location column in flat mode only
- [x] **Inline edit** — all cells inline in table (no modal)
- [x] **Kit presentation** — `kit_header` + `kit_component` rows in flat array; visual indent + tags; “Add kit” seeds header + 2 components
- [x] **Labor lines** — same grid; `phase_id` select when `line_kind = labor`

## Open forks (for Step 4 planning session)

| Fork | Spike observation | Status |
|------|-------------------|--------|
| Default editor mode | Flat is simpler; grouped needs `site_location` registry on site | **Locked** — flat default; grouped toggle when wave 2b geography ships ([decision](../decisions/estimate.md#decision-estimate-line-editor--expand-on-add-and-grouped-table-ui-2026-06-23)) |
| Kit UX | Header + visible components works; rolled-up single line not prototyped | **Locked** — expand on add; kit_header + kit_component; same columns ([decision](../decisions/estimate.md#decision-estimate-line-editor--expand-on-add-and-grouped-table-ui-2026-06-23)) |
| Commercial `quote_sections` | Not in spike | **Deferred v1** — [`estimate.md`](../surface-specs/estimate.md) locked answer #5 |
| Drag reorder | Not in spike (catalog table has it) | Add when implementing production `line_items` |
| `item_id` picker | Part select only; item labels static | Wire both in wave 3 catalog |

## Screenshots

*Manual — capture flat + grouped modes from `/estimates/demo` during step 4 review.*

## Decisions captured

Planning session (step 4) adds dated blocks to [`decisions/estimate.md`](../decisions/estimate.md). Line editor expand-on-add, grouped Table UI, and kit shape are **locked** — [2026-06-23 decision](../decisions/estimate.md#decision-estimate-line-editor--expand-on-add-and-grouped-table-ui-2026-06-23).

**Provisional notes from build:**

1. Grouped mode is a **view** over the same flat `line_items` DTO — matches O3 grouped (B) decision.
2. Labor/product shape difference is column-level (phase + part), not a separate sub-grid.
3. Save/Revert uses the same header toolbar pattern as `CatalogTableSurface` / `SiteDetailForm`.

## Verify

- [x] `/estimates/demo` loads with fixture lines
- [x] Flat mode — add line, edit cells, remove row, Save logs payload
- [x] Grouped mode — collapse per `site_location`; add line pre-fills location
- [x] Kit — FACP kit in fixture; Add kit; delete header removes components
- [x] Labor line shows phase select; product line shows part select
- [x] Spike notes doc exists (this file)
