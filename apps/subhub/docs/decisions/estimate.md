# SubHub decisions — estimate

> Estimates, quote structure, and line grouping by site geography.

[Index](./README.md) · [All decisions](../decisions/README.md)

> **Amended (2026-07-05):** [unified item tree — lifecycle + line lock](./catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) (**D6a–D6b**) — see [estimate lifecycle freeze](#decision-estimate-lifecycle-freeze-and-line-lock-2026-07-05).
>
> **Amended (2026-07-09):** [scope / condition / zone / qty](#decision-estimate-scope-condition-zone-and-line-qty-2026-07-09) — site zones = place only; estimate **conditions** hold commercial knobs; line qty + zone allocations.
>
> **Amended (2026-07-09):** [condition-only commercial tree](#decision-condition-only-commercial-tree-2026-07-09) — drop `estimate_scope`; every commercial node is `estimate_condition`; lines require `estimate_condition_id` ([37y](../tasks/37y-condition-only-commercial-tree.md)).
>
> **Amended (2026-07-11):** [dual line locks + live preview](#decision-estimate-dual-line-locks-and-live-preview-2026-07-11) — replace `lock` enum with `sales_locked` + `material_locked`; server line-preview before Save ([37aa](../tasks/37aa-estimate-line-live-preview.md)).

---

### Decision: estimate dual line locks and live preview (2026-07-11)

**Status:** **Locked.** **Task:** [37aa](../tasks/37aa-estimate-line-live-preview.md). **Supersedes** draft line `lock` enum behavior in [lifecycle freeze / D6b](#decision-estimate-lifecycle-freeze-and-line-lock-2026-07-05) and [catalog D6b–D6d](./catalog.md#estimate-line-locking-d6b--locked-2026-07-05). **Keeps:** estimate-level `sent`+ freeze (D6a) — no preview/recalc when not `draft`.

**Problem:** Save-time costing (37f/37g) leaves material / freight / sell / part columns stale until PATCH. The `none | sell | line` enum cannot express independent “sticky sell” and “sticky item/part” while still updating underlying cost snapshots.

#### Locked choices

| # | Topic | Choice |
|---|--------|--------|
| **P1** | Preview math | **Server** — thin non-persisting endpoint reuses `recalcProductLine` / part resolver; no client formula fork |
| **P2** | Triggers | Item select/reselect, part pick/clear, **condition configuration** change. **Not** quantity for unit costs |
| **P3** | Fan-out | Item/part → **that line only**. Config → **all lines** under the **currently selected condition** |
| **P4** | Quantity | Client-local **ext sell** only (`qty × unit_price`); never unit cost/sell snapshots |
| **P5** | Preview vs locks | Preview response **never writes** lock flags; applies money/part fields **subject to** current flags |
| **P6** | Storage | Drop `estimate_line.lock`. Add **`sales_locked`** + **`material_locked`** (`BOOLEAN NOT NULL DEFAULT false`). Independent (any combo) |
| **P7** | Backfill | `none` → both false; `sell` → `sales_locked`; `line` → **both true** (conservative) |

#### Sales lock

| | |
|---|---|
| **On** | Manual edit of `unit_price`, or explicit sales-lock control |
| **While on** | Recalc/preview **must not overwrite** `unit_price`. Costs + `unit_price_target` **still update** (margin may go negative). Sell remains **editable** |
| **Off** | Explicit unlock / sync → `sales_locked = false` and `unit_price = unit_price_target` |

#### Material lock

| | |
|---|---|
| **On** | Manual PN pick, or explicit material-lock control. Auto single-match PN suggestion does **not** lock |
| **While on** | Freeze **`item_id` + `part_id`** (block item change). **Costing still runs** from that pin |
| **Off** | Explicit unlock → `material_locked = false` + **re-resolve** part (0/1/many); adopt suggested PN when available |

#### Recalc / preview apply (draft)

```text
always: recompute unit_material, unit_labor, unit_freight, unit_incidental,
        unit_cost, unit_price_target  (unless estimate not draft)

if material_locked:
  keep item_id + part_id from form (resolver must not swap PN)
else:
  apply resolver part_id / vendor_part_id

if sales_locked:
  keep unit_price
else:
  unit_price = unit_price_target
```

#### Preview API

**One** `POST` endpoint accepting **1..n** line snapshots + draft condition config needed for costing; returns parallel results; **no DB write**. UI: one line for item/part; batch for selected-condition config fan-out. Debounce config fan-out (~300ms); per-line loading OK.

**Rationale:** Estimators need immediate column feedback; dual booleans match sticky sell vs sticky catalog identity without freezing cost math; single batch endpoint avoids duplicating the commercial engine.

---

### Decision: condition-only commercial tree (2026-07-09)

**Status:** **Locked (Y1–Y5).** **Amends:** [G2 / G5a–G5e](#decision-estimate-scope-condition-zone-and-line-qty-2026-07-09) (scope instance as commercial root); [D3 / D5 / D6f](./catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05). **Keeps:** G1 (site place-only), G3 (qty + allocations), G4 (win/job deferred), X1 block-delete, X3 `qty_manual`, X4 estimate-path-only. **Implementation:** [37y](../tasks/37y-condition-only-commercial-tree.md).

**Problem:** 37x split commercial roots (`estimate_scope`) from children (`estimate_condition`). Complexity lived only on conditions; phases/specs lived on both. Product intent is one nestable condition tree — every node carries the same knobs; children optionally override parents.

#### Vocabulary (amended)

| Term | Role |
|------|------|
| **Condition** | Estimate-owned commercial node. Forest of trees under an estimate. Root conditions link a **catalog root item** (`root_item_id`). Children nest via `parent_condition_id`. Holds **name**, **complexity**, **labor phases**, **spec values**. |
| **Scope** (catalog) | Catalog root **item** (`item` with scope node type) — not an estimate table. Multiple root conditions may share the same `root_item_id` (Bldg A / Bldg B Intrusion). |
| **Site scope / zone** | Unchanged — place only (G1). |

**Do not** reintroduce `estimate_scope` for quoting.

#### Y1 — Schema: condition forest only (locked)

**Choice:**

| Change | Rule |
|--------|------|
| **Drop** | `estimate_scope`, `estimate_scope_spec`, `estimate_scope_labor_phase` |
| **`estimate_condition`** | `estimate_id`, `parent_condition_id` (null = root), `root_item_id` (**required on roots**; null on children — inherit from tree root), `name`, `complexity_factor_id`, `sort_order` |
| **Keep** | `estimate_condition_spec`, `estimate_condition_labor_phase` |
| **`estimate_line`** | **`estimate_condition_id` NOT NULL**; **drop `estimate_scope_id`** |
| **Migrate** | Each existing `estimate_scope` → one **root** condition (`root_item_id` + name + specs + phases copied); nested conditions reparent under that root; lines with null condition → attach to migrated root; then drop scope tables/columns |

**Invariant:** Child `root_item_id` is null (or must match ancestry root). Spec keys for a tree come from the root’s `root_item_id`.

#### Y2 — Lines always on a condition (locked)

**Choice:** No condition → no line items. Add-line disabled until a condition is selected. Removes “scope defaults / condition null → complexity 100%” path.

#### Y3 — Knobs on every condition (locked)

**Choice:** Every selected condition (root or child) shows in **C**: **name** + **complexity** + **labor phases** + **specs**.

**Cascade:** `line → condition (leaf) → … → condition (root) → catalog/org`.

| Field | Own | Inherit |
|-------|-----|---------|
| Spec | row in `estimate_condition_spec` | walk ancestors |
| Complexity | non-null `complexity_factor_id` | nearest ancestor with non-null; else **100%** |
| Phases | junction rows present (**including empty set**) | nearest ancestor with an explicit phase set; else catalog/item default |

#### Y4 — C inherit checkbox (locked)

**Choice:** On **child** conditions, each overrideable control has a checkbox:

| State | Meaning | Control |
|-------|---------|---------|
| **unchecked** | use ancestry | **read-only**; display resolved ancestor value |
| **checked** | own override | editable; persist on this condition |

On **root** conditions: no ancestry — checkbox hidden / N/A; controls always own.

**Phases detail:** unchecked = inherit; checked + empty multi-select = explicit “no phases” (distinct from inherit).

#### Y5 — S panel (locked)

**Choice:** **S** is a condition forest only.

| Action | Behavior |
|--------|----------|
| **Add root** | Pick catalog root item → create root condition (`root_item_id`, name prefill, seed specs) |
| **Add condition** | Child under selected condition |
| **Delete** | Block if lines reference node or descendants (X1) |
| **Select** | Filters LI to lines with that `estimate_condition_id` (and optionally descendants — lock in 37y Step 4 if needed; default: **selected node only**) |
| **Rename** | Name edits in **C** (X2) |

**Out of scope (still X4):** win → job condition copy; job unresolved queue (G4).

**Task:** [37y — condition-only commercial tree](../tasks/37y-condition-only-commercial-tree.md).

---

### Decision: estimate scope, condition, zone, and line qty (2026-07-09)

**Status:** **Locked (G1–G4, G5a–G5e).** **Amended (2026-07-09)** by [condition-only commercial tree](#decision-condition-only-commercial-tree-2026-07-09) (**Y1–Y5**) — commercial roots are conditions, not `estimate_scope`. **Amends:** commercial use of `estimate_zone` / line `site_zone_id` in [D5](./catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) / D6g; [37w W2–W4](#decision-estimate-line-items-tab--three-panel-layout-2026-07-08). **Does not** change site ownership of scopes/zones. **Implementation:** [37x](../tasks/37x-estimate-conditions-allocations.md) (shipped); superseding schema/UI in [37y](../tasks/37y-condition-only-commercial-tree.md).

**Problem:** Site **zones** (building → floor → door) were overloaded as both **install place** and **commercial override** (complexity, phases, spec values). Estimators need different knobs for Warehouse vs Office without inventing fake geography; ops need fine places and incremental place/PN resolve after win.

**Vocabulary (locked):**

| Term | Owner | Role |
|------|--------|------|
| **Cost bucket** | Line snapshots | Material / labor / freight / incidental $ — **not** this decision’s “condition” |
| **Scope instance** | Estimate (`estimate_scope`) | Quote instance of a catalog root (e.g. two “Intrusion Alarm” scopes: Bldg A / Bldg B). Drives the commercial tree root and **spec keys** (defs from that root). Multiple instances per root OK. |
| **Condition** | Estimate only | Costing / filter partition under a scope instance. Holds **spec values**, **labor complexity** (only place complexity is set), **included labor phases**. Children **override** parents. **Must not** coincide with site zones. |
| **Site scope / zone** | Site | **Where** work takes place (building, floor, door, room). Narrow geography only — **no** complexity / phases / spec values on site rows. |
| **Allocation** | Estimate / job line | Optional place rows: `site_zone` × qty-per-zone. |

**Do not call conditions “buckets”** — bucket already means cost composition (M/L/F/I).

#### G1 — Site geography stays place-only (locked)

**Choice:** Keep **site-owned** `site_scope` / `site_zone` tree **as-is** for where work takes place. Zones may be deep (building → section → door). Estimate does **not** move this tree onto the quote. Site geography CRUD remains on site **Scopes & zones**.

**Rationale:** Fine install places belong on the site registry across estimates/jobs; commercial overrides are quote-local.

#### G2 — Estimate conditions (locked)

**Choice:**

- Under each **scope instance**, estimators may create a **condition tree** (nesting allowed so children override parents).
- **Scope instance** drives: tree root, catalog root, **which spec keys** apply.
- **Condition** drives: **spec values**, **labor complexity** (condition-only — not on scope or site), **which labor phases to include**.
- Lines with no condition use **scope-level** defaults for phases/specs; **complexity = 100%** when no condition (or condition has null factor).
- Conditions are **orthogonal** to site zones — “Warehouse” condition need not match a site zone named Warehouse.

**Example:**

```
Bldg A Intrusion          ← scope instance (Intrusion Alarm root — spec keys)
  Office                  ← condition (values / complexity / phases)
  Warehouse               ← condition (child overrides)
Bldg B Intrusion          ← scope instance (same catalog root, second instance)
  (scope defaults only)
```

→ **2** scope instances, **2** conditions under the first — not “4 conditions.”

**Cascade (values):** `line → condition (leaf) → … → condition (ancestor) → scope defaults → catalog/org`.

**Rationale:** Accurate numbers when different parts of the job need different knobs, without polluting site geography.

#### G3 — Line quantity and zone allocations (locked)

**Choice:**

| Field | Role |
|-------|------|
| **Line `quantity`** | Commercial qty (what you sell / cost against) |
| **Allocations** | Optional rows: site zone × qty-per-zone (default **1** when a location is added; editable per location) |
| **Allocated** | `sum(allocation.qty)` |
| **Unallocated** | `quantity − allocated` when `quantity` is set — **derived**, not a substitute for the qty column |

**Qty modes:**

1. **Qty unset** (new line / never manually typed) — allocating **drives** quantity (`quantity` follows `allocated`).
2. **Qty manually set** — quantity is source of truth; invariant **`quantity ≥ allocated`**; unallocated = remainder for job/ops.
3. **Optional sync** — user may re-enable “keep qty in sync with locations” (behaves like unset again).

**Invalid:** `allocated > quantity` (e.g. qty 0 with 43 allocated) — **over-allocated**, not negative unallocated. Block or confirm bump of quantity; never persist over-allocate on save/send/win.

**Rationale:** Supports ROM (qty only), door schedules (allocations), and qty > 1 per location without exploding lines.

#### G4 — Job handoff (locked)

**Choice:**

- **Win** copies **all** estimate lines to the job (sold scope).
- Lines **may** already have zone allocation(s) and/or `part_id`.
- Job must still **link each item to zone(s)** and **pick specific parts** — **not all at once**.
- **Unresolved pool** = job lines (or remaining qty) that are **unplaced** and/or **part-open** — a **filter/queue** over job lines, not a second copy of inventory.
- Progress / individual tracking uses places + qty (existing job progress model); estimate need not explode to one line per door.

**Rationale:** Ops can finish place/PN after sale; estimate stays usable without a complete door schedule.

#### G5 — Schema + panel binding

Work **one sub-decision at a time.** **G5a–G5e locked** — implement via [37x](../tasks/37x-estimate-conditions-allocations.md).

##### G5a — Persist conditions (locked 2026-07-09)

**Choice: A — new `estimate_condition`.**

| Table | Role |
|-------|------|
| `estimate_condition` | `id`, `estimate_scope_id`, `parent_condition_id` (nullable), `name`, **`complexity_factor_id` (nullable — only table that stores complexity)**, `sort_order` |
| `estimate_condition_spec` | Spec **values** for a condition (same shape as today’s `estimate_zone_spec`) |
| `estimate_condition_labor_phase` | Included phases override for a condition |

**Fate of commercial `estimate_zone` / `_spec` / `_labor_phase`:** Retire in the same epic (dev DB — migrate away or drop). Do **not** repurpose the junction as conditions. Site zone remains place-only; optional later “scope includes site zone” membership is a separate concern if needed.

**Rationale:** Clean vocabulary (condition ≠ zone); nesting via `parent_condition_id`; hard cut from checkbox-site-zone-as-commercial-bucket.

##### G5b — Line FKs + allocations (locked 2026-07-09)

**Choice: A — condition FK + allocation child table.**

| Column / table | Role |
|----------------|------|
| `estimate_line.estimate_condition_id` | Nullable — commercial partition; null = scope defaults |
| `estimate_line_allocation` | `estimate_line_id`, `site_zone_id`, `quantity` (default 1) — G3 places |
| `estimate_line.site_zone_id` | **Drop** after migrating any existing single-zone rows into one allocation row |

**Invariant:** `sum(allocation.quantity) ≤ line.quantity` when quantity is set (G3). Condition must belong to the line’s `estimate_scope_id`.

**Rationale:** Matches multi-place / qty-per-zone / unallocated; severs dual-duty `site_zone_id`.

##### G5c — Structure (S) panel (locked 2026-07-09)

**Choice: A — manually built commercial tree (not site geography).** Amends 37w **W2**.

**S shows:** Estimate **scope instances** as roots, with **condition** children (nestable). Built **per estimate** — not imported from `site_tree`.

| Behavior | Rule |
|----------|------|
| **Add** | Add scope instance (pick catalog root; name prefills like site) and/or add condition under a scope or under another condition |
| **Delete** | Nodes deletable — **block** if lines reference ([X1](#x1--delete-when-lines-reference-locked-2026-07-09)) |
| **Select** | Selection filters **LI** to lines for that node |
| **Add line** | Lines may attach to a **scope** (`estimate_condition_id` null → scope defaults) **or** to a **condition** (parent or child) |
| **Rename** | Node **name** edits in **C** (not inline in tree) — [X2](#x2--scope--condition-tree-ownership--ui-locked-2026-07-09) |
| **Places** | Site zones **not** in S — only via line **Places…** / allocations (G3/G5b) |

**Clarification:** Colloquially “the conditions tree,” but roots remain **scope instances** (spec **keys** + default phases/spec values). Children are **conditions** (spec **values** / **complexity** / phases). Selecting the scope root shows lines with `estimate_condition_id` null under that scope (scope-default lines; complexity 100%). Tree chrome mirrors site Scopes & zones; ownership is estimate-only ([X2](#x2--scope--condition-tree-ownership--ui-locked-2026-07-09)).

**Rationale:** Estimator builds the costing structure for this quote; site zones stay place-only.

##### G5d — Config (C) panel (locked 2026-07-09)

**Choice:** **C** is a separate form bound to the **S** selection — **scope or condition**, never site zone. Amends 37w **W4**.

| Selection | C shows |
|-----------|---------|
| **Scope instance** | **Name** + included labor phases + spec **values**. **No** labor complexity control. |
| **Condition** | **Name** + complexity + phases + spec values (child overrides parent / scope for phases & specs per G2) |
| **Nothing selected** | Empty / placeholder copy |

**C fields by selection:** **name** always (for selected node). Complexity picker **only** when a **condition** is selected. Scope selection shows name + phases + specs only.

**Rationale:** Config stays visible while editing lines; commercial knobs live with the commercial tree; complexity is a property of the work **condition**, not the scope root or site place.

##### G5e — D5 / D6g / DBML wording (locked 2026-07-09)

**Choice:** Confirm implementer package as proposed.

| Topic | Locked |
|-------|--------|
| **D5** | **`complexity_factor_id` only on `estimate_condition`** — not on `estimate_scope`, not on site. Null / no condition → **100%**. Child condition overrides parent when nested. |
| **D3 / D6g** | Spec values: **line → condition → scope**; place = **allocations** only; drop commercial role of `site_zone_id` |
| **DBML** | Add `estimate_condition*` (incl. `complexity_factor_id`) + `estimate_line_allocation` + `estimate_scope.name` + `estimate_line.qty_manual`; drop commercial `estimate_zone*`; **drop `estimate_scope.complexity_factor_id`**; drop `estimate_line.site_zone_id` after migrate |
| **37w W1–W3** | S/C/LI topology kept; S = commercial tree (G5c); C complexity only for condition selection (G5d) |

**Task:** [37x — estimate conditions + allocations](../tasks/37x-estimate-conditions-allocations.md).

#### X — Implementation forks (37x)

Work **one at a time** while implementing [37x](../tasks/37x-estimate-conditions-allocations.md).

##### X1 — Delete when lines reference (locked 2026-07-09)

**Choice: A — Block.**

- Refuse delete of a **scope instance** or **condition** while any line references it (`estimate_scope_id` / `estimate_condition_id`), or while any **descendant** condition has referencing lines.
- Empty condition subtrees (no lines on node or descendants) may be deleted.
- UI shows why (e.g. line count). Same spirit as prior scope/zone remove-blocked rule.

**Rationale:** Prevents accidental wipe of quote lines; user moves or deletes lines first.

##### X2 — Scope / condition tree ownership + UI (locked 2026-07-09)

**Choice: A — estimate-owned tree; UI mirrors site Scopes & zones; names edit in C.**

| Topic | Rule |
|-------|------|
| **Ownership** | Commercial tree is **owned by the estimate** — nothing to do with site `site_scope` / `site_zone` for structure. No require/link `site_scope_id` when adding a scope instance. |
| **Schema** | `estimate_scope`: `root_item_id` + editable **`name`** (prefill from root, like site). `estimate_condition`: nested under scope (`parent_condition_id`), editable **`name`**. `site_scope_id` unused for quoting (nullable / ignore). |
| **Tree UX** | Same pattern as site [`SiteScopesZonesTree`](../../components/sites/SiteScopesZonesTree.tsx): Add scope ▾ (catalog root), add child under selection, select node, delete (X1 block if lines). |
| **Label edit** | **Not** inline in the tree (unlike site). Selected node’s **name** edits in the adjacent **C** form together with labor complexity (conditions only), phases, and specs. |

**Rationale:** Parity with site tree chrome for add/select/delete; keep C as the single edit surface for node identity + commercial knobs.

##### X3 — Qty “unset” vs DB (locked 2026-07-09)

**Choice: A — `qty_manual` flag.**

| Column | Rule |
|--------|------|
| `estimate_line.quantity` | Remains `NOT NULL` (default 1) — always a number for costing |
| `estimate_line.qty_manual` | `boolean NOT NULL default false` |

| Mode | Behavior |
|------|----------|
| **`qty_manual = false`** | Allocations **drive** `quantity` (`quantity` follows `sum(allocation.qty)`, or 1 when no allocations) |
| **User edits quantity** | Set `qty_manual = true`; thereafter invariant **`quantity ≥ allocated`** (G3) |
| **Optional sync on** | Clear `qty_manual` (back to allocate-driven) |

**Rationale:** Persists G3 across reload without nullable qty in every cost path.

##### X4 — 37x delivery scope (locked 2026-07-09)

**Choice: A — Estimate path only.**

| In 37x | Deferred |
|--------|----------|
| DBML + migration; DAL/PATCH; costing merge; S/C/LI + Places/allocations UI | Win → job condition/allocation copy; job unresolved queue UI (G4) |

**Rationale:** Land estimate commercial tree + allocations first; win/job handoff is a follow-on task (job wave / after 37h as needed).

**X1–X4 complete** — [37x](../tasks/37x-estimate-conditions-allocations.md) is executable from Step 1.

---

### Decision: estimate Line Items tab — merge Scope config into line tree (2026-07-08)

**Status:** **Locked.** **Supersedes UI of:** [scope tab (2026-07-02)](#decision-estimate-scope-tab--junction-zones-general-scope-row-block-uncheck-2026-07-02) and [37e](../tasks/37e-estimate-scope-tab.md) Scope tab. **No schema change.** **Task:** [37v](../tasks/37v-estimate-structure-tab.md).

**Problem:** Scope config (spec filters, complexity, labor phases) and line editing lived on two tabs over the same scope→zone hierarchy. Filters that drive part resolution and labor $ were invisible while editing lines.

**Choice:**

| # | Topic | Choice |
|---|--------|--------|
| **V1** | Surface | Tabs **General \| Line Items** only — retire **Scope** tab. Scope/zone config + lines in one Ant `Table` + `treeData` on **Line Items**. |
| **V2** | Rows | Parents `scope` / `zone` via `colSpan`; leaves = `estimate_line`. Unzoned lines (`site_zone_id` null) sit **directly under scope** (no synthetic unzoned parent). **≥1 scope required** per line — no estimate-root lines ([scope required](#decision-estimate-scope-required--pricing-overrides-2026-07-04)). |
| **V3** | Include | Toolbar **Add scope ▾** — include existing `site_scope` on quote (`scopes[]`). Scope header **Add zone ▾** — include `site_zone` under scope. Tree shows **included scopes/zones only** (no dimmed unchecked rows). Estimate PATCH does **not** create site geography. Empty `site_tree.scopes` → disabled dropdown + CTA to site **Scopes & zones**. Remove scope/zone blocked when lines reference (existing rule). |
| **V4** | Bucket config | Ant **`Popover`** on scope + zone parent rows (**⚙** trigger). Reuses `EstimateScopeSpecFields`, `EstimateScopeLaborPhaseFields`, `LinkedSelectInput`. Writable gated on Field **`scopes`**. **No Drawer** this pass. |
| **V5** | Summary chips | **Deferred** — no chips in 37v; ⚙ only. |
| **V6** | Kits | **UI removed** — standalone lines only. Schema + DAL kit validation **unchanged** (payload never emits kit rows). Full kit retirement = separate decision. |
| **V7** | Persistence | Unchanged — one RHF form; Add scope/zone dirty client-side; single PATCH → `replaceEstimateCollectionsTx` (scopes then lines + recalc). Fields `scopes` and `line_items` gated independently. |
| **V8** | Line-level specs (O5) | **Deferred** — if adopted later, per-line override is a **leaf** popover, not scope Configure. |

**Open tension:** [shared line editor](./job.md#decision-job-wave-5--implementation-order-2026-06-23) (wave 4d′) — scope/zone chrome is an estimate **wrapper** around the leaf grid; do not fork the grid in a way that blocks shared editor.

**Rationale:** One surface for quote structure; include via dropdowns (not checkbox tree); Configure in context; no DB change.

**Amendment (2026-07-08):** **UI superseded** by [three-panel Line Items layout](#decision-estimate-line-items-tab--three-panel-layout-2026-07-08) ([37w](../tasks/37w-estimate-line-items-panels.md)). **Retained:** V3 include semantics, V6 kits UI removed, V7 persistence, V8 deferred; DAL unchanged. Tree table + Configure popover implementation from [37v](../tasks/37v-estimate-structure-tab.md) is interim until 37w ships.

---

### Decision: estimate Line Items tab — three-panel layout (2026-07-08)

**Status:** **Locked (decisions W1–W9).** Implementation: [37w](../tasks/37w-estimate-line-items-panels.md). **Supersedes UI of:** [37v tree table](#decision-estimate-line-items-tab--merge-scope-config-into-line-tree-2026-07-08). **No schema change.**

**Problem:** Single tree `Table` with scope/zone parent rows (`colSpan`) couples quote structure, bucket config, and line editing in one horizontally scrolling grid. Parent-row chrome fights column pinning, viewport width, and header alignment.

**Choice (decision log):**

| # | Topic | Status | Choice |
|---|--------|--------|--------|
| **W1** | Shell topology | **Locked** | Line Items tab = **three panels** — left rail (**S** + **C** stacked), right pane (**LI** flat). See diagram below. Tabs **General \| Line Items** unchanged. |
| **W2** | S panel — tree content | **Locked** | Same **hierarchy** as site **Scopes & zones**; **full `site_tree`** scopes/zones; **select only** — no add/delete/rename/reorder. See [W5](#w5--s-panel-actions-locked) for include semantics. |
| **W3** | Selection → LI filter | **Locked** | **Scope** selected → lines with that `estimate_scope_id` and **`site_zone_id` null** (unzoned). **Zone** selected → lines matching scope + zone. No pseudo “Unzoned” node in **S**. |
| **W4** | C panel — config binding | **Locked** | Permanent bucket config for **S** selection; popover **retired**. Fields: complexity, labor phases (multi-select), specs. |
| **W5** | S panel — quote include/remove UI | **Locked** | **No** Add scope / Add zone / Remove from quote on Line Items tab. **S** is selection only; **LI** + **C** target selected node. |
| **W6** | LI panel — flat grid | **Locked** | Flat **37f** columns; **Add line** = `FieldArrayTable` footer (`dashed` / `block` / `PlusOutlined`); requires **S** selection; implicit include ([W5](#w5--s-panel-actions-locked)). |
| **W7** | Responsive / narrow viewports | **Locked** | **Desktop-only v1** — defer responsive breakpoints; ship three-panel layout at desktop widths. |
| **W8** | Persistence | **Locked** | Unchanged 37v **V7** — one RHF form; `scopes[]` + `line_items[]`; dirty until Save; `replaceEstimateCollectionsTx`; **S** selection client-only. |
| **W9** | Deferred carry-forward | **Locked** | V5 chips defer; V6 kits UI removed retain; V8 O5 defer; LI drag→**S** defer; **4d′** grid must not block shared editor. |

#### W1 — Shell topology (locked)

```
┌─────────────────┬────────────────────────────────────┐
│        S        │                                    │
│  quote structure│                                    │
│  tree           │           LI                       │
│                 │   flat line-item table             │
│                 │   (no tree / no parent rows)       │
├─────────────────┤                                    │
│        C        │                                    │
│  bucket config  │                                    │
│  (scope or zone)│                                    │
└─────────────────┴────────────────────────────────────┘
```

| Panel | Id | Role |
|-------|-----|------|
| **S** | structure | Navigate **included** scopes/zones on this quote; primary selection drives **C** and **LI**. |
| **C** | config | Edit bucket fields for the selected scope or zone (specs, complexity, labor phases). Replaces 37v Configure **Popover**. |
| **LI** | lines | Edit `estimate_line` rows for the current selection only — standard flat `Table`, shared column set from 37f. |

**Supersedes (37v UI only):** V1 single tree `Table`; V2 scope/zone parent rows + `colSpan`; V4 Configure popover on parent rows.

**Explicitly not in W1:** selection rules, add/remove UX, column list, responsive breakpoints, persistence shape — see W2–W9.

**Rationale:** Separates navigation, configuration, and line editing into viewport-stable regions; flat **LI** avoids tree-table layout hacks; **C** always visible when a bucket is selected.

**Task:** [37w](../tasks/37w-estimate-line-items-panels.md).

#### W2 — S panel tree (locked)

**Choice:**

- **Structure:** Mirror site [`SiteScopesZonesTree`](../components/sites/SiteScopesZonesTree.tsx) — scope parents, nested zone children (same nesting as `site_tree`).
- **Nodes shown:** Full site geography from **`site_tree`** (all scopes/zones on the anchored site), same shape as site **Scopes & zones**. Not limited to scopes already on `scopes[]` — selection drives work surface.
- **Interaction:** **Selection only** — no rename, delete, add-zone inline, reorder, and **no** Add scope / Add zone / Remove from quote affordances ([W5](#w5--s-panel-actions-locked)). Site geography CRUD remains on **site** Scopes & zones.
- **Panel title:** **Scopes & zones** (parity with site tab).
- **No pseudo-node** for unzoned lines — selecting a **scope** is how you work unzoned lines ([W3](#w3--selection--li-filter-locked)).

**Open (non-blocking):** line-count badges on nodes; default selection on load — decide in W4/W6 pass or ship first scope selected.

**Rationale:** Familiar site geography shape; estimate panel is navigation not site editing.

#### W3 — Selection → LI filter (locked)

| **S** selection | **LI** shows | New line targets |
|-----------------|--------------|------------------|
| **Scope** | `line_items` where `estimate_scope_id` = scope and `site_zone_id` **null** | Same — unzoned under scope |
| **Zone** | `line_items` where `estimate_scope_id` + `site_zone_id` match zone | Same zone bucket |

Aligns with [37v V2](../tasks/37v-estimate-structure-tab.md) unzoned-under-scope rule and [scope required](#decision-estimate-scope-required--pricing-overrides-2026-07-04).

**Empty LI copy (draft):** scope — “No unzoned lines in this scope”; zone — “No lines in this zone”; nothing selected — “Select a scope or zone”.

#### W4 — C panel config (locked)

**Choice:**

- **Binding:** **C** always reflects the current **S** selection. Scope selected → scope bucket; zone selected → zone bucket (zone overrides via `zoneIndex`).
- **Content:** Same bucket configuration as 37v Configure **Popover** — promote [`EstimateBucketConfigurePanel`](../components/estimates/EstimateBucketConfigurePanel.tsx) to the permanent **C** panel (not a popover).
- **Fields (in order):**
  1. **Complexity factor** — `LinkedSelectInput` (clearable).
  2. **Labor phases** — **multi-select** `Select` (replace checkbox list in popover); same `included_labor_phases` RHF path; empty selection = include all phases from item labor group (existing 37n rule).
  3. **Specs** — `EstimateScopeSpecFields` (scope/zone bucket spec filters).
- **Permissions:** Editable when Field **`scopes`** has `write` (37v V4); read-only otherwise.
- **Empty state:** No **S** selection → “Select a scope or zone to configure filters and phases.” **C** panel disabled/placeholder, not hidden.
- **37v popover:** **Retired** — no ⚙ fallback in 37w (W7 may stack panels instead).

**Rationale:** Config visible while editing lines in **LI**; single surface replaces easy-to-miss popover.

#### W5 — S panel actions (locked)

**Choice:**

- **No include/remove UI** on Line Items tab — retire 37v toolbar **Add scope ▾**, header **Add zone ▾**, and **Remove from quote**.
- **S** is the site scope/zone tree for **selection only**. Whatever scope or zone is selected is the active bucket for **LI** (add / edit / delete lines) and **C** (bucket config).
- **Implicit include:** When the user adds a line or edits **C** for a site scope/zone not yet on `scopes[]`, the client **auto-includes** that bucket (`addScopeToQuote` / `addZoneToQuote` helpers) — dirty until Save; no separate “add to quote” step.
- **Site geography** is never created from the estimate — only existing `site_tree` nodes are selectable. Empty `site_tree.scopes` → CTA to site **Scopes & zones** (37v V3 empty state retained).
- **Remove scope/zone from quote:** Not exposed in 37w Line Items UI (scopes/zones drop from `scopes[]` only via Save replace when no longer referenced, or a future General-tab action — **out of scope for 37w**).

**Supersedes (37v UI):** V3 explicit Add scope / Add zone dropdowns and remove-from-quote on parent rows.

**Rationale:** Selection is the quote structure UX; avoids duplicate include chrome alongside navigation tree.

#### W6 — LI flat grid (locked)

**Choice:**

- **Table:** Flat `Table` only — no `treeData`, no scope/zone parent rows. Shows lines filtered per [W3](#w3--selection--li-filter-locked) for current **S** selection.
- **Columns:** Reuse **37f** shared column set (item, part, description, qty, unit, material/freight/incidental/labor, target, cost, lock, sell, ext sell, delete). Do not fork grid in a way that blocks **4d′** shared line editor.
- **Add line:** Same affordance as other collection tables — [`FieldArrayTable`](../components/form/FieldArrayTable.tsx) footer pattern: `Button` **`type="dashed"`** **`block`** **`icon={<PlusOutlined />}`** label **Add line** (see stakeholders, spec definitions, labor phases). Placed in **LI** panel table footer, not a scope header or floating toolbar.
- **Add line enabled when:** Field `line_items` writable, form not disabled, and a scope or zone is selected in **S**. Disabled with helper copy if nothing selected.
- **On add:** Append to `line_items[]` with `estimate_scope_id` / `site_zone_id` from **S** + [implicit include](#w5--s-panel-actions-locked) if bucket not yet on `scopes[]`.
- **Remove line:** Per-row delete in actions column (37f / `FieldArrayTable` pattern).
- **Scroll:** Horizontal scroll within **LI** pane only when needed; table may grow with viewport (no forced min-width scroll from tree chrome).
- **Drag retarget:** [Deferred](#w6-note--drag-to-reassign-deferred) — optional drop on **S** only if row drag ships later.

**Supersedes (37v UI):** Parent-row **+ Line** buttons; bottom/tree Add line affordances.

**Rationale:** Matches established SubHub table UX; flat grid fits **LI** pane without colspan hacks.

#### W7 — Responsive layout (locked)

**Choice:** **Desktop-only v1** — no breakpoint-specific layout in 37w. Ship S | LI / C three-panel at desktop widths; narrow viewports may scroll horizontally or clip — **responsive stack/drawer deferred** to a follow-up task.

**Rationale:** Unblocks panel layout without mobile design pass; estimator primary surface is desktop.

#### W8 — Persistence (locked)

**Choice:** Unchanged from 37v **V7**:

- One RHF form on `estimate_detail`; `scopes[]` + `line_items[]` + `site_tree` read model.
- Dirty until Save; single PATCH → `replaceEstimateCollectionsTx`.
- Fields `scopes` and `line_items` gated independently on manifest.
- **S** selection (`selectedSiteScopeId` / `selectedSiteZoneId` or equivalent) is **client UI state only** — not persisted.

**No schema change.**

#### W9 — Deferred carry-forward (locked)

| Item | 37w disposition |
|------|-----------------|
| 37v **V5** summary chips | **Defer** — optional line-count badges on **S** nodes remain open |
| 37v **V6** kits UI removed | **Retain** — standalone lines only in **LI** |
| 37v **V8** line-level specs (O5) | **Defer** |
| LI drag → **S** drop retarget | **Defer** ([note](#w6-note--drag-to-reassign-deferred)) |
| **4d′** shared line editor | **LI** must not fork grid in a way that blocks retrofit |

#### W6 note — drag to reassign (deferred)

If **LI** row drag is implemented, **optional:** drop on **S** scope/zone node retargets `estimate_scope_id` / `site_zone_id` on dragged line(s). **Not required for 37w v1** — record under W6/W9; no row drag in current UI.

---

### Decision: estimate lifecycle freeze and line lock (2026-07-05)

**Status:** **Locked** for estimate-level freeze (D6a). **Draft line lock column superseded (2026-07-11)** by [dual line locks + live preview](#decision-estimate-dual-line-locks-and-live-preview-2026-07-11) (`sales_locked` + `material_locked`). **Originally superseded** 37f [O4 sell lock deferred](../tasks/37f-estimate-line-costing.md#decision-o4--sell-lock-deferred-2026-07-04).

| `estimate.status` | Edit policy | Recalc / preview |
|-------------------|-------------|------------------|
| **`draft`** | Full edit — lines, conditions, specs, complexity | **Yes** — per dual locks ([2026-07-11](#decision-estimate-dual-line-locks-and-live-preview-2026-07-11)) |
| **`sent`** | **Frozen** — no PATCH to quote-driving fields | **No** — snapshots are the issued quote |
| **`won`** | Immutable (existing) | **No** |
| **`lost` / `expired`** | Read-only (v1: same freeze as `sent`) | **No** |

**Historical (`lock` enum, retired 2026-07-11):** `none` \| `sell` \| `line` — see catalog D6b archive notes. Estimate-level freeze (`sent`+) still supersedes per-line locks.

**Source:** [catalog D6a](./catalog.md#estimate-status-and-recalc-policy-d6a--locked-2026-07-05); line locks → [dual locks decision](#decision-estimate-dual-line-locks-and-live-preview-2026-07-11).

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

**Status:** **UI superseded (2026-07-08)** by [Line Items tab merge](#decision-estimate-line-items-tab--merge-scope-config-into-line-tree-2026-07-08) ([37v](../tasks/37v-estimate-structure-tab.md)). **Retained at DAL:** `estimate_zone` junction, block remove when lines reference scope/zone. **Scope tab checkbox UX retired.**

**Status (historical):** **Partially superseded (2026-07-04)** — [scope required + no ROM General](./estimate.md#decision-estimate-scope-required--pricing-overrides-2026-07-04).

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
