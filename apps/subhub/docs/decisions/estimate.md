# SubHub decisions — estimate

> Estimates, quote structure, and line grouping by site geography.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: estimate site anchor — gate lines, immutable after create (2026-06-30)

**Choice:**

- `profile.site_id` required on create; **not patchable** after estimate row exists.
- Line Items tab + **Scope** tab gated on non-empty `site_id` in form (create) or loaded DTO (edit).
- **Create only:** changing `site_id` clears `scopes` and `line_items` client-side.
- Site field: `LinkedSelectInput` pattern (`… Add site` → `/sites/new` + picker return).

**Rationale:** Quote scope is property-scoped; moving site after save invalidates scope buckets and line placement. Stricter than job site change (estimate always anchored at create).

**Spec:** [`estimate.md`](../surface-specs/estimate.md) · **Task:** [33](../tasks/33-estimate-site-anchor.md).

---

### Decision: estimate scope tab — junction zones, General scope row, block uncheck (2026-07-02)

**Status:** **Partially superseded (2026-07-04)** — [scope required + no ROM General](./estimate.md#decision-estimate-scope-required--pricing-overrides-2026-07-04). **Retained:** `estimate_zone` junction, block uncheck when lines reference scope/zone, Scope tab UX.

**Choice:**

- **`estimate_zone`** junction (PK `estimate_scope_id`, `site_zone_id`) — zone checkbox persistence; no `use` boolean.
- ~~**Synthetic General `estimate_scope`**~~ — **superseded**; no ROM / site-General scope rows (2026-07-04).
- **Uncheck** scope/zone blocked when `line_items` reference bucket/zone.
- **37e** Scope tab + minimal line retarget; **37f** zone line parents + item picker + costing.

**Task:** [37e](../tasks/37e-estimate-scope-tab.md) · **Planning:** [11](../planning/11-categories-scope-model.md).

---

### Decision: estimate scope required + pricing overrides (2026-07-04)

**Status:** **Locked.** **Supersedes** ROM General bucket and optional scopes from [estimate scope (2026-06-30)](#decision-estimate-scope--category-roots-checkbox-site-tree-item-first-lines-2026-06-30) and General row from [scope tab (2026-07-02)](#decision-estimate-scope-tab--junction-zones-general-scope-row-block-uncheck-2026-07-02). **Commercial resolution:** [catalog commercial costing](./catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04).

**Choice:**

- **≥1 checked `estimate_scope`** required before Line Items (every line has non-null `estimate_scope_id`).
- **No ROM General** — no `estimate_scope_id = null` lines; no full-catalog item picker.
- **Site** — every **`site_zone`** belongs to a **`site_scope`** (no site General zones).
- **Item picker** — always **`root_category_id` subtree** of the line’s checked scope.
- **Pricing** — org + category define **`unit_price_target`**; estimator edits **`unit_price`** only — **not** rate type pickers ([commercial decision](./catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04)).
- **Complexity** — from **category** inherit walk only (not scope/zone override).

**Task:** [37f](../tasks/37f-estimate-line-costing.md) · **Planning:** [11](../planning/11-categories-scope-model.md).

---

### Decision: estimate scope — category roots, checkbox site tree, item-first lines (2026-06-30)

**Status:** **Locked**; **amended (2026-07-04)** by [scope required](#decision-estimate-scope-required--pricing-overrides-2026-07-04) and [commercial costing](./catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04). Supersedes wave **4c′** (`estimate_area` snapshots, Import from site) and [estimate_system tabs (2026-06-27)](#decision-estimate--estimate_system-tabs-system-specs-no-section-v1-2026-06-27) **as implemented**.

**Choice:**

- **Scope tab** — read-only **Scopes & zones** site tree + checkboxes; check zone → auto-check parent **`site_scope`**.
- **Spec chart** on checked scope/zone — **`estimate_scope_spec`** / **`estimate_zone_spec`**; **`spec_def`** per root category; effective participation filters part resolution.
- **Lines** — **`item_id`** + optional **`part_id`** pin; cost + target/actual sell snapshotted on line.
- **Item picker** — root category **TreeSelect** for line’s scope (**amended:** no full-catalog General).
- **Commercial** — org + category defaults; scope/zone overrides ([commercial decision](./catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04)).

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Task:** [37a](../tasks/37a-category-scope-decision-dbml-migration.md) · **Apply:** [37b](../tasks/37b-category-scope-migration-apply.md).

---

### Decision: estimate — `estimate_system` tabs, system specs, no section v1 (2026-06-27)

**Status:** **Superseded (implementation)** by [estimate scope (2026-06-30)](#decision-estimate-scope--category-roots-checkbox-site-tree-item-first-lines-2026-06-30).

**Status:** **C2 locked.** [`02-estimates.md`](../planning/02-estimates.md), [`06-catalog-trade-system.md`](../planning/06-catalog-trade-system.md).

**Choice:**

- **`estimate_section` not v1** — subtotals by area/asset per **`estimate_system`** tab.
- **`estimate_system`** + **`estimate_system_spec`** / area / line overrides; FK **`system_spec_def`** / **`system_spec_option`** (UUID).
- **`manufacturer_party_id`** not used as spec knob.
- One won estimate → one job. Multi-system = multiple tabs.

**Rationale:** Each system has own spec knobs and area tree.


### Decision: location_confidence — defer v1 (E4 locked 2026-06-27)

**Choice:** No `estimate.location_confidence` column in v1. UI may warn when lines lack `site_area_id` / `site_asset_id` FKs — derived, not stored. Does not block save or win.

**Rationale:** Geography optional on estimates; avoid schema for a UI-only hint.


### Decision: estimate — per-system assumptions, no section v1, one job per win (2026-06-27)

**Superseded by** [estimate_system tabs (2026-06-27)](#decision-estimate--estimate_system-tabs-system-specs-no-section-v1-2026-06-27).


### Decision: estimate / job line grouping — site geography (2026-06-17)

**Amended (2026-06-27):** lines FK **`site_area_id` / `site_asset_id`** — see [estimate (2026-06-27)](#decision-estimate--per-system-assumptions-no-section-v1-one-job-per-win-2026-06-27).

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O3).

**Choice:** **`site_section` and `site_location` on the site are the source of truth** for physical place. Estimates and jobs reference **`site_location_id`** on lines; they do not invent a parallel geography model. Site setup (`site_detail` geography Fields) should precede quoting that groups by place.

**Line editor shape (estimate + job):**

| Condition | UI / Surface shape |
|-----------|-------------------|
| Quote/job **does not** group by site section or location | **Flat** — single `line_items` collection (`estimate_line` / `job_line`) |
| Quote/job **groups** by site **section** and/or **location** | **Grouped (B)** — nested or grouped editor keyed off the site's `site_section` / `site_location` registry; lines still persist as flat rows with `site_location_id` (and optional section rollup via `site_location.site_section_id`) |

**Win → job:** Copy line snapshots including `site_location_id`; same grouping rules on `job_detail`. Promote `proposed` → `active` site locations on job complete (existing lifecycle decision).

**Commercial rollups (separate from site geography):** `estimate_section` remains for **proposal / CSI category buckets** — optional sibling collection `quote_sections` on `estimate_detail` (`title`, `category_id`); lines keep `estimate_section_id` FK. Do not confuse with `site_section` (physical place on the building).

**Wave ordering:** Estimates can ship **flat** in wave 4; **grouped-by-place UX** requires `site_section` / `site_location` on `site_detail` — see [site geography timing](./site.md#decision-site-geography-on-site_detail--timing-2026-06-17).

**Catalog:** [`surfaces.md`](../surfaces.md#estimate-list--estimate_detail).


### Decision: estimate line editor — expand on add and grouped Table UI (2026-06-23)

**Status:** Locked in [task 20](../tasks/20-ui-discovery.md) step 4.

**Choice:** `estimate_detail` **`line_items`** editor uses one **antd `Table`** (`size="small"`). Persisted DTO stays a **flat** `estimate_line` array; geography grouping and kits are **presentation** only.

#### Add behavior — expand to visible lines

| Trigger | On add |
|---------|--------|
| **Catalog `item`** (`product`, `labor`, `expense`) | One **standalone** line — seed `description`, `quantity`, `unit`, `unit_cost`, `unit_price`, `item_id`, and kind-specific fields (`part_id`, `phase_id`) from catalog defaults |
| **Catalog `item` (`assembly`)** | **Expand immediately** to visible component lines (from `item_part_link`) at the chosen `site_location_id` — not a single rolled-up row |
| **Kit / package** | **`kit_header`** + **`kit_component`** rows (`parent_line_id` + `line_role`) — same columns as standalone lines; header may carry customer-facing sell rollup |

**Not in v1:** configurators, invisible rolled-up assembly lines, `item_item_link`, auto rules (“if option X add Y”).

**Rationale:** Wire length, labor phases, and part alternates stay editable as ordinary lines. Customer-facing rollups belong on print/PDF or optional `quote_sections`, not hidden quote rows.

#### Grouped-by-place view — geography parent rows

When grouped mode is on, the table `dataSource` is a **flattened tree** with row kinds:

| Row kind | Source | `site_location_id` |
|----------|--------|-------------------|
| **General** | Lines with null location | — |
| **Section** | `site_section` bucket (organize only — lines do not FK section) | — |
| **Location** | `site_location` | row id |
| **Line** | `estimate_line` | FK |

**Parent rows (General, Section, Location):** custom cell **`render`** (or equivalent row renderer) — **do not** render child line editors (qty, cost, sell, pickers) in parent cells. Typically **one label cell** (with expand/collapse + “Add line here”) and **`colSpan`** across remaining columns so parent rows stay chrome-only.

**Line rows:** full inline editors for the shared column set.

Section grouping is derived from `site_location.site_section_id`; locations without a section appear as top-level location parents (see [section vs location](./site.md#decision-section-vs-location--granularity-2026-06-19)).

#### Columns — one set for all line rows

**Kit components** and **assembly-expanded** lines use the **same columns** as standalone lines (`line_kind`, description, item/part/phase, qty, unit, cost, sell, ext sell, actions). Differentiate with **indent** + optional `line_role` tag — not a separate sub-table or column schema.

Default editor mode: **flat** until `site_detail` geography ships (wave 2b); grouped toggle follows ([wave ordering](#decision-estimate--job-line-grouping--site-geography-2026-06-17)).

#### Density

- `Table` **`size="small"`**; tight cell padding; avoid redundant labels inside cells.
- Prefer single-line controls (`Input`, `InputNumber`, `Select`) over multi-row field stacks.
- **Flat mode:** optional **Location** column when geography exists; omit in minimal flat v1 if needed.

**Spike:** [`/estimates/demo`](http://localhost:3003/estimates/demo) — [`estimate-line-editor.md`](../spikes/estimate-line-editor.md).


### Decision: estimate wave 4 — implementation order (2026-06-23)

**Status:** Locked in [task 20](../tasks/20-ui-discovery.md) step 4.

**Choice:**

| Topic | Order |
|-------|--------|
| **First ship** | Wave **4a** — estimate migration + YAML + DAL + `/estimates` UI with **flat** `line_items` Table ([implement spec](../surface-specs/estimate.md)) |
| **`quote_sections`** | **Defer** v1 — not required for first estimate ship |
| **Grouped-by-place toggle** | After wave **2b** `sections` / `locations` on `site_detail` (spec [`site-geography.md`](../surface-specs/site-geography.md)) |
| **Catalog pickers** | Minimal description-only lines OK in 4a; wire `item` / `part` / `phase` when catalog Surfaces ship |
| **`win` → job** | Specced on `estimate_detail`; job copy when job slice (#21) ships |
| **Next spike** | `job_detail` tabs — **after** estimate production UI starts, **before** `job.md` implementation |
| **Task 19 resume** | **`estimate.md`** ✅ → **`job.md`** → minimal **`item.md`** → catalog tables (#16–18) → procurement/billing |

**Rationale:** Flat quotes unblock sales flow without site geography UI. Grouped editor and live `site_location` registry depend on wave 2b. Ops specs follow proven estimate UI per [planning model](./general.md#decision-planning-model--ui-discovery-before-ops-specs-2026-06-20).

**Amendment (2026-06-23):** [Job wave 5 planning](./job.md#decision-job-wave-5--implementation-order-2026-06-23) locks **catalog-first** line UI. Wave **4a** `line_items` grid is **interim** — keep DAL; replace UI in **4d′** after wave **3** (`part` + `item`) and shared line editor spike (**3e**). Same component then ships on `job_detail` Scope, PO, and invoice lines. **`win` → job** moves to **5b** (after job 5a shell + line editor), not immediately after job migration.
