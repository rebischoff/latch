# SubHub decisions — catalog

> Parts, items, categories, labor phases, and catalog modeling.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: `spec_def` value types and part-matching rules (2026-07-02)

**Status:** **Locked** (pending DDL migration in task **37f** follow-on). **Amends** [C10 in planning 11](../planning/11-categories-scope-model.md) (`filter_mode` behavior). **Supersedes** enum-only assumptions in [system specs C2 (2026-06-27)](#decision-system-specs-and-part-compatibility-c2-locked-2026-06-27) for **storage shape** only — FK-based defs unchanged.

**Choice:**

#### `spec_def.value_type` (catalog dimension)

| `value_type` | `spec_option` | Part storage (`manufacturer_part_spec`) | Bucket storage (scope / zone / line) |
|--------------|---------------|----------------------------------------|--------------------------------------|
| **`enum`** | required (`options[]`) | **One row per allowed option** — same `spec_def_id`, distinct `spec_option_id` (part may list multiple compatible values) | **Single** `spec_option_id` per `spec_def_id` (project picks one) |
| **`boolean`** | omit | `value_boolean` on one row per part | `value_boolean` |
| **`text`** | omit | `value_text` on one row per part | `value_text` |
| **`number`** | omit | `value_number` on one row; optional `value_number_max` for inclusive range (**v1:** exact match only; range match deferred) | `value_number` |

**`spec_def` metadata (new columns — migration follow-on):**

| Column | Notes |
|--------|--------|
| `unit` | Canonical storage unit for `number` defs — e.g. `ton`, `V`, `A`. Required when `value_type = number`. |
| `display_unit` | Optional UI label — e.g. store amperes, display `mA`. Conversion at **catalog write** only. |
| `wildcard_option_id` | Optional FK → `spec_option` — enum value meaning “any / N/A” on parts; always matches a non-blank or blank bucket (see matching). |

**Normalization:** canonical values are stored at **part admin / import** time, not at quote time. Example: `200 mA` → `value_number = 0.2`, `spec_def.unit = A`. Estimate bucket uses the same canonical unit.

**Not v1:** `value_type = range` as a separate type; multi-number OR on bucket; JSON attribute blobs on `manufacturer_part`; using `manufacturer_part.specs` text for filtering.

#### Estimate bucket UX (unchanged tables, clarified semantics)

| Level | Table | Cardinality |
|-------|-------|-------------|
| Scope | `estimate_scope_spec` | At most **one row per `spec_def_id`** per scope; value **optional** (blank = no filter on that dimension) |
| Zone | `estimate_zone_spec` | Same; overrides scope for lines in that zone |
| Line | `estimate_line_spec` | Same; overrides zone (37f) |

**Scope spec panel:** show the **union of effective `spec_def` ids** for the checked scope’s root subtree — see [category spec participation (2026-07-02)](#decision-category-spec-participation--inherit-include-exclude-2026-07-02). Values may be left blank.

#### Part-matching algorithm (37f resolver)

**Inputs:** merged **bucket** values (resolve line → zone → scope), **effective participation** per [inheritance rules](#decision-category-spec-participation--inherit-include-exclude-2026-07-02), catalog `manufacturer_part` candidates in item’s category subtree.

For each `spec_def_id` in the **effective participation** set for the line’s item:

| Bucket value | Part rows for def | Match |
|--------------|-------------------|-------|
| **Blank / null** | any | **Pass** (dimension not used to filter) |
| **Enum** `spec_option_id = X` | none | **Fail** |
| **Enum** `X` | one or more rows including `X` | **Pass** |
| **Enum** `X` | rows only with wildcard option | **Pass** |
| **Enum** `X` | rows with options neither `X` nor wildcard | **Fail** |
| **Number** `N` | no row | **Fail** |
| **Number** `N` | `value_number = N` (exact, same unit) | **Pass** |
| **Number** `N` | `value_number` ≤ `N` ≤ `value_number_max` | **Pass** when range columns populated (**deferred** v1) |
| **Boolean / text** | equality on stored value | **Pass** / **Fail** |

**`filter_mode` (`required` \| `prefer`):** v1 treats all participating dimensions as **required** when bucket value is non-blank. When bucket is blank, dimension is ignored. **`prefer`** scoring deferred.

**Outcomes after filter:**

| Matches | Line behavior |
|---------|----------------|
| **0** | Keep `item_id`; `part_id` null; `material_status = generic`; item default cost; UI alert |
| **1** | Suggest / auto-fill `part_id`; `material_status = suggested` or `verified` when user confirms |
| **Many** | Generic description; `part_id` null unless user picks from **filtered PN list**; costing uses org default-part rule until pin |

User may always **override** to a `part_id` in the filtered set (manifest-gated).

#### Worked example — HVAC evaporator coil

**Part** `COIL-454B-036` (“3-Ton Evaporator Coil”), category **Cooling Infrastructure**:

| `spec_def.code` | `value_type` | Part rows (`manufacturer_part_spec`) |
|-----------------|--------------|--------------------------------------|
| `refrigerant` | enum | one row → `R-454B` |
| `tonnage` | number (`unit = ton`) | `value_number = 3.0` |
| `voltage` | enum | two rows → `208V`, `230V` |
| `phase` | number (`unit = phase`) | `value_number = 1` |
| `control_type` | enum | two rows → `24V`, `Communicating` |
| `finish` | enum | one row → wildcard `N/A` |

**Estimate** — scope **HVAC / Cooling** checked; bucket:

| Def | Scope value | Zone “Rooftop” override |
|-----|-------------|-------------------------|
| `refrigerant` | `R-454B` | — |
| `tonnage` | `3.0` | — |
| `voltage` | `208V` | — |
| `phase` | `1` | — |
| `control_type` | *(blank)* | `Communicating` |
| `finish` | *(blank)* | — |

**Line** — item “Evaporator coil 3 ton”, zone Rooftop:

1. Effective bucket: `control_type = Communicating` (zone), others from scope as above; `finish` blank → ignored.
2. Filter parts: voltage must include `208V`; tonnage `3.0`; refrigerant `R-454B`; phase `1`; control includes `Communicating`; finish wildcard passes.
3. `COIL-454B-036` matches → suggested `part_id` pin; user may override to another PN in the filtered set only.

**Rationale:** Enum multi-rows model “part supports A or B”; bucket picks one project assumption. Numbers need canonical units for HVAC tonnage and electrical dims. Blank bucket + wildcard options avoid over-constraining ROM quotes. Normalized rows preserve manifest, audit, and win→job spec snapshots — JSON blobs do not.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Tasks:** [37f](../tasks/37f-estimate-line-costing.md) *(TBD)* · **Spec:** [`category.md`](../surface-specs/category.md), [`estimate.md`](../surface-specs/estimate.md).

---

### Decision: category spec participation — inherit, include, exclude (2026-07-02)

**Status:** **Locked** (pending migration + **37d amend**). **Amends** [37d](../tasks/37d-category-catalog-dal-surfaces.md) flat `spec_participation` checkboxes and [C9 in planning 11](../planning/11-categories-scope-model.md). **Pairs with** [spec_def value types (2026-07-02)](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02).

**Choice:**

#### Definitions vs participation (unchanged split)

| Layer | Table / Field | Who | Purpose |
|-------|---------------|-----|---------|
| **Definitions** | `spec_def` + `spec_option` on **root** category only | Catalog admin | Namespace of allowed dimensions (SLC protocol, Color, Series, …) |
| **Participation** | `category_spec_def` + **`category_spec_exclude`** on **any** node | Catalog admin | Which dimensions apply when classifying / quoting under this node |

**`spec_definitions`** on root = CRUD for defs. **`spec_participation`** on root + nested = edit participation deltas (includes + excludes).

#### Storage (migration follow-on)

| Table | Semantics |
|-------|-----------|
| **`category_spec_def`** | **Include** — add `spec_def_id` to this node’s effective set (in addition to inherited) |
| **`category_spec_exclude`** *(new)* | **Exclude** — remove `spec_def_id` from inherited set (opt-out) |

PK `(category_id, spec_def_id)` on both. A def cannot appear in both include and exclude on the same node (DAL rejects).

#### Effective participation algorithm

```text
effective(root R):
  if category_spec_def rows on R:  return those spec_def_ids
  else:                            return ∅   // root with no rows = no inherited base

effective(child C):
  inherited  = effective(parent(C))
  includes   = spec_def_ids in category_spec_def where category_id = C
  excludes   = spec_def_ids in category_spec_exclude where category_id = C
  return (inherited ∪ includes) \ excludes
```

**New child** with no include/exclude rows: `effective(child) = effective(parent)` — full inheritance.

**Item / part with multiple `item_category` / `part_category` links:** `effective(item) = ⋃ effective(category)` across all linked categories.

#### Estimate scope spec panel

When **`estimate_scope`** is checked for root category **R**:

```text
scopePanelDefs(R) = ⋃ effective(C) for all category nodes C in subtree rooted at R
```

Show one control per `spec_def_id` in `scopePanelDefs(R)`; values optional ([bucket rules](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02)). Zone panel shows the **same def list**; values may override scope per def.

**Amends 37e:** scope DAL joins **`scopePanelDefs(R)`** (subtree union of effective participation) — not all root `spec_def` rows. PATCH rejects `spec_def_id` not in panel (`invalid_scope_panel_spec`).

#### Line part filter

Use **`effective(item)`** for the item’s linked categories (not the whole scope subtree). Intersect with bucket values; filter `manufacturer_part_spec` per [matching rules](#decision-spec_def-value-types-and-part-matching-rules-2026-07-02).

#### Category admin UI (37d amend)

| Node | Show |
|------|------|
| **Root** | `spec_definitions` + `spec_participation` (base includes; excludes rare on root) |
| **Nested** | Read-only **Inherited** list + editable **Include** / **Exclude** checklists against root namespace |

Creating a child **does not** copy rows — inheritance is implicit until admin adds include/exclude deltas ([planning 12](../planning/12-master-detail-chrome.md) seeding remains deferred).

#### Migration from 37d flat checkboxes

Existing **`category_spec_def`** rows on nested nodes → reinterpret as **includes only** (additive to inherited parent effective set). **`category_spec_exclude`** starts empty. Admins may need a one-time pass to remove redundant include rows that are now inherited automatically.

#### Worked example — Fire Alarm

**Definitions** on root **Fire Alarm** (`spec_def`): `slc_protocol`, `color`, `series`.

**Participation:**

| Category | Includes (`category_spec_def`) | Excludes (`category_spec_exclude`) | **Effective** |
|----------|-------------------------------|-------------------------------------|---------------|
| Fire Alarm (root) | `slc_protocol` | — | `{ slc_protocol }` |
| Initiating devices | — | — | `{ slc_protocol }` *(inherited)* |
| Modules | — | — | `{ slc_protocol }` |
| Notification appliances | `color`, `series` | `slc_protocol` | `{ color, series }` |

**Estimate** — scope **Fire Alarm** checked:

- **Scope spec panel** defs: `{ slc_protocol, color, series }` *(union across subtree)*
- Estimator may set SLC = LiteSpeed, Color = Red; leave Series blank.

**Line** — item “Horn/strobe” linked to **Notification appliances**, same scope:

- **Filter participation:** `{ color, series }` only — SLC **not** applied to part filter for this item.
- Bucket: Color = Red → filters parts; blank Series → no filter on series.

**Line** — item “Pull station” linked to **Initiating devices**:

- **Filter participation:** `{ slc_protocol }` — bucket SLC value applies; Color on scope does not filter this line’s parts.

**Rationale:** Inheritance matches how admins think about category trees; opt-out covers branches that share most but not all parent specs (notification vs initiating). Union on scope panel collects every dimension needed anywhere in the trade; per-item effective set avoids over-filtering lines. Normalized include/exclude rows stay manifest- and audit-friendly.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Tasks:** [37d](../tasks/37d-category-catalog-dal-surfaces.md) amend · [37f](../tasks/37f-estimate-line-costing.md) *(TBD)* · **Spec:** [`category.md`](../surface-specs/category.md).

---

### Decision: category-only scope — roots replace catalog system (2026-06-30)

**Status:** **Locked.** Supersedes [system specs C2 (2026-06-27)](#decision-system-specs-and-part-compatibility-c2-locked-2026-06-27) **as implemented** (`system` table).

**Choice:**

- **Drop catalog `system`.** Scope roots = **`category.parent_id IS NULL`** (Fire Alarm, Intrusion, HVAC, …).
- **`spec_def.root_category_id`** + **`spec_option`**; **`category_spec_def`** on nested categories; **`manufacturer_part_spec.spec_def_id`** unchanged intent.
- Items/parts: M:N **`item_category`**, **`part_category`**; shared category tree.
- Site instances: **`site_scope.root_category_id`**; zones **`site_zone`**.
- Estimate: **`estimate_scope`** + live site checkbox scope; item-first lines + optional **`part_id`** pin.
- **`trade`** retained in DDL but **not** on estimate/site scope path v1.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Tasks:** [37a](../tasks/37a-category-scope-decision-dbml-migration.md) (DDL) · [37d](../tasks/37d-category-catalog-dal-surfaces.md) (surfaces) · **Spec:** [`category.md`](../surface-specs/category.md).

---

### Decision: system specs and part compatibility (C2 locked 2026-06-27)

**Status:** **Superseded (implementation)** by [category-only scope (2026-06-30)](#decision-category-only-scope--roots-replace-catalog-system-2026-06-30). Spec/part FK **semantics** unchanged; **`system_id`** → **`root_category_id`**.

**Choice:**

- **`system`** catalog table (`id`, `name`); **`site_system.system_id`** for instances.
- **`system_spec_def`** (UUID PK) + **`system_spec_option`**; **`manufacturer_part_spec`** FKs to def + option.
- **`manufacturer_party_id`** = catalog/PO only (party FK, manufacturer role); not estimate spec knobs.
- **`manufacturer_part.specs`** text = human notes only.
- Estimate: **`estimate_system`** tabs + **`estimate_system_spec`** / area / line overrides.

**Rationale:** Protocol/spec dimensions filter parts; manufacturer brand is wrong knob; UUID spec defs align part and estimate rows.


### Decision: phase templates — per root category default + item override (J5 locked 2026-06-27)

**Choice:** `item.phase_template_id` when set; else **`category.default_phase_template_id`** on scope root; else org fallback. Job line create / win copies steps → `scope_phase`.

**Amends:** J5 referenced `system.default_phase_template_id` — same rule on root category row.

**Rationale:** Default install/program/test paths differ by scope root; items override when needed.


### Decision: trade, system type, assumptions, and part tags (2026-06-27)

**Superseded by** [system specs C2 (2026-06-27)](#decision-system-specs-and-part-compatibility-c2-locked-2026-06-27).


### Decision: labor phases — catalog only in v1 (2026-06-17)

**Amended (2026-06-27):** org **`phase`** evolves toward **`phase_template_step`** for scope phase seeding — see [trade/system (2026-06-27)](#decision-trade-system-type-assumptions-and-part-tags-2026-06-27).

**Choice:** Org catalog **`phase`** (prewire, installation, programming, testing, …). Attach on **labor** `estimate_line` / `job_line` via `phase_id` and on **`job_work_item`**.

- **Scope subset:** only create labor lines for phases performed; omit lines for GC/existing work.
- **`labor_class`** remains the **rate bucket**; **`phase`** is the work/reporting kind.
- **Scheduling deferred (v2):** no `scheduled_start` / `job_phase` instance table in v1.

**Rationale:** Phasing for field reporting and labor attachment without Gantt complexity in v1.


### Decision: catalog — simplified parts, items, categories (2026-06-16)

**Choice:**

| Area | Schema |
|------|--------|
| **UOM** | On **`manufacturer_part` only** (`unit`, optional `purchase_unit`, `units_per_purchase`). `vendor_part` has no UOM — price is per part's purchase unit when set. |
| **Vendor catalog** | **`vendor_part`** — vendor PN + current `unit_price` (merged for v1). |
| **Item shapes** | One exact part (`default_part_id`), one-of-many (`item_part_link.link_role = alternate`), or group (`kind = assembly`, `link_role = component`). |
| **Item default cost** | `default_part_id` + `default_vendor_part_id` → `vendor_part.unit_price` (DAL handles unit conversion). |
| **Labor** | **`labor_class`** = rate bucket on labor items. Catalog BOM is **`item_part_link` only** (parts). Labor bundles = multiple `estimate_line` rows or standalone labor items — no `item_item_link`. |
| **Categories** | Single **`category`** tree (`parent_id`). Optional **`csi_code`** when org uses CSI MasterFormat — no `classification_system` / parallel commercial taxonomy. |
| **Quote grouping** | `estimate_section.category_id` (and optional `estimate.category_id`) — **not** per line. |
| **Expense / rental** | `item.kind = expense` for travel, per diem; equipment rental may be expense item or `job_party` subcontractor. |

**Rationale:** One category concept covers merchandising and optional CSI alignment. UOM on the manufacturer part avoids vendor/part unit mismatch. `item_part_link` covers all part composition; `labor_class` tags labor items for rates when labor is quoted as its own line.


### Decision: `part_detail` — MPN catalog and vendor pricing (2026-06-19)

**Choice:**

| Area | v1 |
|------|-----|
| **`profile` Field** | `manufacturer_party_id`, `mpn`, `description`, `unit`, `purchase_unit`, `units_per_purchase` only |
| **Deferred on part Surface** | `specs`, `cut_sheet_url`, part **requirements** graph (e.g. part A requires spec B) — revisit at estimate/job + submittal slice |
| **`vendor_pricing` Field** | Separate manifest Field — `vendor_party_id`, `vendor_pn`, `vendor_description`, `unit_price`, `is_preferred` |
| **Currency** | Not on `vendor_part` Surface row; v1 assumes org currency; per-vendor currency if ever needed |
| **Price history** | Deferred — one current row per vendor PN ([simplified catalog](#decision-catalog--simplified-parts-items-categories-2026-06-16)) |
| **`is_preferred`** | At most one `true` per part; DAL clears siblings on write — default buy path when item costing unset |
| **`part_list`** | Org-wide; search `mpn` + `description`; sort manufacturer name then `mpn`; **no** manufacturer filter v1 |
| **Policy** | `profile` and `vendor_pricing` independent Field grants — no sensitive-field tier |

**Rationale:** Wave 3 catalog is the MPN + buy-price anchor. Technical specs and submittal packages belong to estimating/engineering workflows, not catalog housekeeping. Preferred vendor per part gives PO/costing a default without item-level duplication.

**Spec:** [`surface-specs/part.md`](../surface-specs/part.md).
