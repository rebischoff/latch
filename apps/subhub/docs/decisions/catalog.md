# SubHub decisions — catalog

> Parts, items, categories, labor phases, and catalog modeling.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: commercial costing — org tables, category defaults, estimate overrides (2026-07-04)

**Status:** **Locked.** **Supersedes** [C14 in planning 11](../planning/11-categories-scope-model.md) (commercial types primary on scope bucket) and **`labor_context_type`** as a costing input. **Amends** [estimate scope (2026-06-30)](./estimate.md#decision-estimate-scope--category-roots-checkbox-site-tree-item-first-lines-2026-06-30) (no ROM General bucket). **Tasks:** [37f](../tasks/37f-estimate-line-costing.md) (part filter + material snapshot) · [37g](../tasks/37g-commercial-costing.md) (org surfaces + full engine).

**Choice:**

#### Layer 1 — Org rate tables (list surfaces; no detail pane)

| Table | v1 shape | Notes |
|-------|----------|--------|
| **`labor_rate_type`** | `name`, `rate_cents`, optional `labor_class_id` | Trades: low-voltage installer, FA programmer, pipe fitter, … |
| **`incidental_rate_type`** | `name`, `kind` (`percent_of_material` v1), `percent` | Freight / incidental = **% of material only** v1 |
| **`markup_type`** | `name`, `markup_percent` | % on cost (M+L+I); split material vs labor markup **deferred** |
| **`complexity_factor`** | `name`, `factor_percent` | 100 = normal; 125 = difficult retrofit, … |

**No `sales_commission` table v1** — commission is back-office / analytics, not a line costing input.

**`labor_context_type`** — retained in DDL from `033` but **not** used in costing v1 (may repurpose or drop in migration follow-on).

#### Layer 2 — Category (primary assignment; inherit walk up tree)

**Not** the spec participation exclude model. Walk **node → parent → root**; first non-null FK wins.

| On category | Purpose |
|-------------|---------|
| **`phase_template_id`** | Ordered steps: `phase` + `labor_rate_type_id` + **hours per unit** |
| **`markup_type_id`** | Default margin profile for items in subtree |
| **`incidental_rate_type_id`** | Default freight/incidental profile |
| **`complexity_factor_id`** | Default labor difficulty multiplier for subtree |

**Item commercial override — deferred v1** (revisit when assemblies break category defaults).

#### Layer 3 — Estimate (line sell override only)

**Amended (2026-07-04):** Estimator **cannot** override which org **rate types** apply (`markup_type`, `labor_rate_type`, `incidental_rate_type`, `complexity_factor`) on scope, zone, or line. Those resolve from **category inherit walk** only. Estimator may override the **actual sell rate** — **`unit_price`** on the line (vs system-computed **`unit_price_target`**).

| On estimate | Purpose |
|-------------|---------|
| **`estimate_line.unit_price`** | **Actual sell** — estimator sharpens pencil here |
| **`estimate_line.unit_price_target`** | **Policy sell** snapshot from resolver (audit / manager review) |

**Not on estimate v1:** `estimate_scope.markup_type_id` override UI; `estimate_scope` / `estimate_zone` **`complexity_factor_id`** pickers. Columns from migration `033` on `estimate_scope` are **unused for costing** (may drop in follow-on migration).

**Line snapshots (`estimate_line`):**

```text
unit_material, unit_labor, unit_incidental  ← cost components at save/recalc
unit_cost                                   ← M + L + I
unit_price_target                           ← policy sell from catalog rate types (snapshot)
unit_price                                  ← actual sell (estimator override allowed)
```

#### Resolution (at line save / recalc)

```text
markup_type, incidental_type, complexity, labor_rate_type (per phase)
  ← category.walk_up(...) only — estimator cannot change type selection on quote

unit_price_target ← f(resolved cost components, markup_type from category)
unit_price        ← estimator edit; set to target on **new line** first calc; **never** overwritten on recalc v1 ([sell lock deferred](../tasks/37f-estimate-line-costing.md#decision-o4--sell-lock-deferred-2026-07-04))
```

**Rationale:** Org tables define rate **cards**; category assigns **which card** applies; quote captures **policy vs actual sell** for margin review — not a second rate-card picker on the estimate.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md).

---

### Decision: spec ownership — `spec_def.category_id`, drop `category_spec_def` (2026-07-04)

**Status:** **Locked.** **Supersedes** the **storage** of [assign-once, branch exclude (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03) — the separate `category_spec_def` assignment table. **Retains:** the `effective(N, D)` algorithm, [owner-branch visibility (2026-07-03)](#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03), `category_spec_exclude`, `scopePanelDefs` subtree union, estimate/part consumers (all FK `spec_def.id`, unchanged).

**Problem:** `category_spec_def` had `UNIQUE (spec_def_id)` — a 1:1 join table, which is really a **column**. The split between `spec_def.root_category_id` (namespace) and `category_spec_def` (owner) let a def exist with **no owner row** (visible only at root, invisible on descendants — the "SLC not inherited" bug).

**Choice:**

#### Ownership is a column on `spec_def`

| Concept | Before | After |
|---------|--------|-------|
| **Namespace root** | `spec_def.root_category_id` (flat equality) | Derived — root ancestor of `category_id` |
| **Owner (assignment)** | `category_spec_def` row, `UNIQUE (spec_def_id)` | **`spec_def.category_id`** — the one owning category |
| **Branch cut** | `category_spec_exclude` | `category_spec_exclude` (unchanged) |

**`spec_def.category_id`** is the single owning category. It may be a **root or nested** category — root is not special. Assign-once is now **structural** (one row = one owner; double-assign impossible). No separate assignment step to forget.

#### Storage

| Table | Semantics | Constraint |
|-------|-----------|------------|
| **`spec_def`** | `category_id` = owner; def flows to all descendants of owner | FK `category_id → category` (`delete: cascade`) |
| **`category_spec_exclude`** | Branch cut — def no longer applies at this node **or any descendant** | PK `(category_id, spec_def_id)`; **no re-include** below |

**`category_spec_def` dropped.** `spec_def.root_category_id` dropped (renamed conceptually into `category_id`).

#### Rules (unchanged intent, restated on new storage)

| # | Rule | Enforcement |
|---|------|-------------|
| R1 | A spec is owned by **exactly one** category (root or nested) | Structural — `spec_def.category_id` single column |
| R2 | Owned spec is available on **all descendants** unless excluded; exclude cuts that node **and** its descendants | `effective(N,D)`: `category_id` ancestor-or-self of `N`, no exclude on path |
| R3 | Excluded spec **cannot** be re-included further down | Any exclude on path blocks; nothing re-includes |
| R4 | Editable **only** on the owning category; descendants show a checkbox to **exclude**; nodes below an exclude do **not** render the spec | Owner = `category_id === node`; checkbox writes/removes `category_spec_exclude`; below-exclude filtered out |

#### Effective participation algorithm (unchanged)

```text
owner(D) = spec_def.category_id for D

effective(N, D):
  A = owner(D)
  if A is not an ancestor of N and A ≠ N:            return false
  if ∃ exclude (X, D) where X on path A → N (incl.): return false
  return true
```

**Namespace query change:** "all defs for scope root R" moves from `WHERE root_category_id = R` (flat) to **owner in subtree of R** (defs whose `category_id` is R or a descendant of R). Category counts are modest (C9) — recursive walk is fine.

#### Worked example — Fire Alarm

```text
Fire Alarm          ← spec_def.category_id = Fire Alarm  (SLC protocol)
├── Initiating      ← spec_def.category_id = Initiating   (Spec B)
│   └── test 4
│       └── test 5
├── Test 1
└── Test 3
```

| Def | Owner (`spec_def.category_id`) | `category_spec_exclude` |
|-----|-------------------------------|-------------------------|
| SLC protocol | Fire Alarm (root) | — |
| Spec B | Initiating | — |

**Effective:** SLC on Fire Alarm + all descendants (Initiating, test 4, test 5, Test 1, Test 3). Spec B on Initiating, test 4, test 5. This is the behavior the prior storage failed to deliver for SLC.

**Migration:** [038 plan](../migrations/038-category-spec-owner-column-plan.md) — backfill `category_id` from `category_spec_def` where present, else `root_category_id` (auto-fixes unassigned defs like SLC).

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Spec:** [`category.md`](../surface-specs/category.md).

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

**Scope spec panel:** show the **union of effective `spec_def` ids** for the checked scope’s root subtree — see [category spec participation (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03). Values may be left blank.

#### Part-matching algorithm (37f resolver)

**Inputs:** merged **bucket** values (resolve line → zone → scope), **effective participation** per [assign-once rules](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03), catalog `manufacturer_part` candidates in item’s category subtree.

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
| **0** | Keep `item_id`; `part_id` null; `part_locked` false; `material_status = generic`; **`unit_material` ← `item.fallback_unit_cost`**; UI alert |
| **1** | Set `part_id` from match; `part_locked` false (system may update on recalc); `material_status = suggested`; `unit_material` ← matched part vendor |
| **Many** | `part_id` null until user picks from **filtered PN list**; `part_locked` true when user picks; **`unit_material` ← max vendor among filtered** or **`item.fallback_unit_cost`** |

**Line shape:** **`item_id`** required on product lines; **`part_id`** optional — set when filter yields exactly one PN or when user selects from filtered list. **`part_locked`** — when `true`, resolver/recalc **must not** change `part_id` (user-confirmed PN); when `false`, system may set/clear `part_id` on item/bucket change.

**Material price resolution (v1):** pinned `part_id` → that part’s vendor path; else match-count rules in [O1](../tasks/37f-estimate-line-costing.md#decision-o1--ambiguous-part-material-cost-2026-07-04).

User may **override** `part_id` only to a value in the **filtered set** (manifest-gated). User override sets **`part_locked = true`**.

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

**Status:** **Superseded (algorithm + UI)** by [assign-once, branch exclude (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03). **Retained** for history: table split (`category_spec_def` / `category_spec_exclude`), `scopePanelDefs` union, estimate bucket wiring. **Do not implement** the delta algorithm or Inherited/Include/Exclude UI from this block.

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

### Decision: category spec participation — assign-once, branch exclude (2026-07-03)

**Status:** **Locked.** **Supersedes** [inherit / include / exclude (2026-07-02)](#decision-category-spec-participation--inherit-include-exclude-2026-07-02) **algorithm, storage semantics, and category admin UI.** **Retains:** `spec_def` namespace per scope root; `category_spec_def` + `category_spec_exclude` tables; `scopePanelDefs(R)` subtree union; Policy A root participation; estimate/part consumers unchanged at API shape.

**Choice:**

#### Definitions vs participation (unchanged split)

| Layer | Table | Who | Purpose |
|-------|-------|-----|---------|
| **Definitions** | `spec_def` + `spec_option` | **Scope root only** (CRUD) | Namespace of dimensions (SLC, Color, Series, …) — **not** assigned per category |
| **Participation** | `category_spec_def` + `category_spec_exclude` | Any node in root’s tree | Which defs **apply** when classifying / quoting under a node |

**Ancestry rule:** participation flows only along **ancestor → descendant** lines in the **same** scope-root tree. Siblings do not share participation. Different scope roots (`a` vs `b`) never share `spec_def` rows.

#### Storage

| Table | Semantics | Constraint |
|-------|-----------|------------|
| **`category_spec_def`** | **Assignment** — the **one** category where this def is introduced in the tree | **`UNIQUE (spec_def_id)`** — at most one assignment row per def |
| **`category_spec_exclude`** | **Branch cut** — def no longer applies at this node **or any descendant** | PK `(category_id, spec_def_id)`; **no re-include** below an exclude |

A def cannot appear in both tables on the **same** node (DAL rejects).

**Policy A (root):** a def participates at the scope root only when `category_spec_def` assigns it to the root row (no automatic “all defs active at root”).

#### Effective participation algorithm

```text
assign(D) = category_id from category_spec_def where spec_def_id = D
            (null if no row — def exists in namespace but is inactive everywhere)

effective(N, D):
  A = assign(D)
  if A is null:                         return false
  if A is not an ancestor of N
     and A ≠ N:                        return false
  if ∃ exclude row (X, D) where X is on the path
     from A down to N (inclusive):     return false
  return true

effective(N) = { D | effective(N, D) }
```

**No re-include:** an exclude on node `c` removes def `D` for `c` and **all descendants**. A descendant **cannot** restore `D` via `category_spec_def`.

**Item / part with multiple category links:** `effective(item) = ⋃ effective(category)` across `item_category` / `part_category` links (unchanged).

#### Estimate scope spec panel (unchanged intent)

```text
scopePanelDefs(R) = ⋃ effective(C) for all category nodes C in subtree rooted at R
```

PATCH rejects `spec_def_id` not in `scopePanelDefs(R)` (`invalid_scope_panel_spec`).

#### Category admin UI

| Node | Show |
|------|------|
| **Root** | **`spec_definitions`** only — CRUD defs + enum options. **No** separate “base includes” section. |
| **Nested** | **Read-only** `spec_definitions` table (root namespace) + one **Participates** checkbox per def |

**Checkbox → DB (nested):**

| UI state | DB action |
|----------|-----------|
| Participates, def unassigned | `INSERT category_spec_def (this category, def)` — fails if def already assigned elsewhere |
| Participates, assigned at ancestor, inherited | no rows (implicit) |
| Does not participate, would inherit | `INSERT category_spec_exclude (this category, def)` |
| Does not participate, not inherited | no rows |

**Root participation:** optional — same checkbox column if root shows participation; assignment row on root when checked (Policy A).

Creating a child **does not** copy rows — inheritance is implicit until admin assigns or excludes ([planning 12](../planning/12-master-detail-chrome.md) seeding deferred).

#### Migration from 37d2 delta model

| Situation | Action |
|-----------|--------|
| Multiple `category_spec_def` rows per `spec_def_id` | **Data pass** before `UNIQUE` — keep one assignment (shallowest / admin choice); drop redundant rows |
| Nested rows that only duplicated inheritance | Delete — effective set unchanged under assign-once |
| `category_spec_exclude` rows | Keep — semantics tighten (no re-include below) |

DDL follow-on: migration **037** — `UNIQUE (spec_def_id)` on `category_spec_def`. See [037 plan](../migrations/037-category-spec-assign-once-plan.md).

#### Worked example — Fire Alarm

**Definitions** on root **Fire Alarm:** `slc_protocol`, `color`, `series`.

**Assignment + exclude (DB rows):**

| Def | `category_spec_def` (assign) | `category_spec_exclude` |
|-----|------------------------------|-------------------------|
| `slc_protocol` | Fire Alarm (root) | Notification appliances |
| `color` | Notification appliances | — |
| `series` | Notification appliances | — |

**Effective (computed):**

| Category | Effective defs |
|----------|----------------|
| Fire Alarm (root) | `{ slc_protocol }` |
| Initiating devices | `{ slc_protocol }` *(assigned at root, on path)* |
| Modules | `{ slc_protocol }` |
| Notification appliances | `{ color, series }` *(slc cut by exclude)* |

**Estimate** — scope **Fire Alarm** checked: scope panel `{ slc_protocol, color, series }`. Line filter participation per `effective(item)` on linked category — same outcomes as prior Fire Alarm example.

**Rationale:** One assignment per def matches “introduced here, inferred downhill.” Exclude is a branch guillotine — simpler than delta includes + re-include. UI is one checklist on descendants; definitions stay root-editable only.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Tasks:** [37d3](../tasks/37d3-category-spec-participation-simplify.md) · [37f](../tasks/37f-estimate-line-costing.md) · **Spec:** [`category.md`](../surface-specs/category.md).

**UI visibility:** **Superseded (admin per-node visibility)** by [owner-branch knowledge (2026-07-03)](#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03). **Retains:** assign-once storage, branch exclude, `effective()` / `scopePanelDefs` algorithms.

---

### Decision: category spec visibility — owner-branch knowledge (2026-07-03)

**Status:** **Locked.** **Supersedes** [assign-once UI table (2026-07-03)](#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03) **category admin visibility only.** **Retains:** `category_spec_def` assign-once, `category_spec_exclude` branch cut, `effective(N, D)` participation algorithm, `scopePanelDefs` subtree union, estimate/part consumers. **Shipped:** task [37d4](../tasks/37d4-category-spec-visibility.md) (2026-07-04).

**Choice:**

#### Concepts

| Term | Meaning |
|------|---------|
| **Owner** | The single category with `category_spec_def` for def `D` |
| **Knowledge** | Category admin (and DAL read for that node) is aware `D` exists |
| **Use** | `D` is in `effective(N)` — participates for quoting, part matching, etc. |

Knowledge and use can diverge only at an **exclude** node: the node that wrote `category_spec_exclude` **knows** `D` but does **not** use it.

#### Rules

| # | Rule |
|---|------|
| R1 | Each def is **assigned to exactly one** category (owner). |
| R2 | Every **descendant** of the owner **knows** and **uses** `D` unless R2.1 applies. |
| R2.1 | If category `X` on the path owner → `N` **excludes** `D`, then `X` **knows** but does **not** use `D`; every **descendant of `X`** has **no knowledge** of `D` (branch cut for visibility and participation). |
| R3 | Only the **owner** may **edit or delete** the def (display name, type, enum options). All other nodes: read-only at most, or invisible per R2.1. |
| R4 | Any **descendant** of the owner may **exclude** an ancestral assignment (exclude row only — not a second assign). |

**Not inherited upward:** ancestors and siblings of the owner have **no knowledge** of `D`.

**Storage unchanged:** `spec_def` rows remain namespaced by scope root (`root_category_id`); assignment and exclude tables carry owner-branch semantics. Implementation maps owner → edit rights; visibility filter is per-node.

#### Worked example — generic tree

```text
1
└── 1-1          ← assign(D) here (owner)
    ├── 1-1-1    ← exclude(D) here
    │   └── 1-1-1-1
    └── 1-1-2
2
3
├── 3-1
└── 3-2
```

| Category | Knows `D`? | Uses `D`? | Notes |
|----------|------------|-----------|-------|
| `1` | no | no | ancestor of owner — not on owner branch |
| `1-1` | yes | yes | owner; edit/delete |
| `1-1-1` | yes | no | exclude node — toggle exclude only |
| `1-1-1-1` | no | no | below exclude — branch cut |
| `1-1-2` | yes | yes | descendant of owner, no exclude on path |
| `2`, `3-1`, `3-2` | no | no | other branches |

#### Category admin UI (target)

| Node vs def `D` | Show in admin? | Editable? | Participates control |
|-----------------|----------------|-----------|----------------------|
| Owner | yes | yes (def CRUD) | n/a — always uses |
| Descendant, on path, not excluded | yes | no (read-only def) | inherited — no row; uses implicitly |
| Descendant, exclude node | yes | no | exclude toggle (active = false) |
| Below exclude | **no** | — | — |
| Ancestor / sibling / other branch | **no** | — | — |
| Unassigned def (namespace only) | scope **root** only | yes (def CRUD) | assign when first introduced |

**Task:** [37d4](../tasks/37d4-category-spec-visibility.md) — DAL visibility filter + category UI amend.

**Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **Spec:** [`category.md`](../surface-specs/category.md).

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
