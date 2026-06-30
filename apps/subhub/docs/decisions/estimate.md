# SubHub decisions — estimate

> Estimates, quote structure, and line grouping by site geography.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: estimate — `estimate_system` tabs, system specs, no section v1 (2026-06-27)

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
