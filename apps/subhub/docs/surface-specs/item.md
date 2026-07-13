# Catalog — `item_list` · `item_detail`

> **Wave:** 3b · **Status:** shipped (37i unified tree + 37g commercial + **37l leaf-quotable**, 2026-07-06); spec Fields shipped (37o, 2026-07-07); **item-level spec participation removed** (37ai, 2026-07-12) · **Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **DBML:** `item`, `item_labor_phase`, `spec_def`, … · **Decisions:** [unified item tree](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) · [commercial costing](../decisions/catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04) · [labor phase inclusion](../decisions/catalog.md#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07) ([37n](../tasks/37n-labor-phase-inclusion.md)) · [spec definitions scoped to root](../decisions/catalog.md#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07) ([37o](../tasks/37o-spec-participation-flatten.md)) · [spec participation removed](../decisions/catalog.md#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12) ([37ai](../tasks/37ai-spec-participation-removal.md))
>
> **Note:** Former `category_*` surfaces renamed to `item_*` (040a). **`item.node_type`** (`scope` \| `category` \| `item`, 044) gates authoring + estimate picker (leaves only). Commercial block on `item_detail`: policy FKs on **scope/category**; **`item_labor_phase`** on **category** (defaults) + **item** (override); `fallback_unit_cost` on quotable leaves. **Specs (37o + UI pivot 2026-07-08; participation removed 37ai 2026-07-12):** `spec_definitions` on scope roots (**Specs** tab) only — **no other node type has any spec Field**. Leaf items (`node_type = item`) render **no Specs section at all**; narrowing at estimate time uses the item's scope-root namespace directly (no per-item opt-in to configure). **Categories carry no spec Fields**, unchanged. `spec_def.code` / `spec_option.code` dropped (048) — matching uses FK ids only. Value types `enum` \| `boolean` \| `number` ([37s](../tasks/37s-spec-defs-ui-drop-range.md)). **Threshold presets + bucket ranges ([37ae](../tasks/37ae-spec-threshold-presets-ddl.md)–[37ah](../tasks/37ah-spec-threshold-presets-estimate-ui.md)):** High/Low-style presets authored in the Specs **Details** popover only — see [decision A1](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12).

**Related:** [`part.md`](./part.md) — part pool assignment (`part_item`) is authored on **`part_detail.item_links`** v1; **`item_detail` omits writable `part_pool`**. `part_specs` writable defs = the linked leaves' scope-root namespace (37ai) — **not** a participation union (`item_spec_participation` dropped). [`spec.md`](./spec.md) *(37o, historical/superseded)* — content folded into this Surface's Specs tab; `spec_participation` cross-references there are stale post-37ai. Site scope picker reads **root items** ([`site.md`](./site.md) task 37c).

---

## Locked product answers (2026-06-30)

| # | Topic | Choice |
|---|--------|--------|
| 1 | **Scope roots** | `category.parent_id IS NULL` — Fire Alarm, Intrusion, HVAC, … |
| 2 | **List pane** | **Tree**, not flat table — full org category forest in list-detail **left pane** |
| 3 | **Detail — all nodes** | **`name`**, `sort_order` editable; **`node_type`** badge + promote/demote (`category` ↔ `item`); **`parent_id`** reparent within same scope root (non-quotable parents only) |
| 4 | **Detail — leaf items** | **No spec Fields at all** *(37ai, 2026-07-12)* — `spec_participation` and `item_spec_participation` are removed. Narrowing at estimate/part time uses the item's scope-root namespace directly (V2) — nothing to author on the leaf itself |
| 5 | **Detail — scope roots** | **`spec_definitions`** *(37o UI pivot)* — **Specs** tab: sortable `FieldArrayTable` (Name · Type · Details). Types: `enum` \| `boolean` \| `number`. Details popover: **enum** options + **threshold presets** (label + option set); **number** unit / decimals + **threshold presets** (label + min/max); **boolean** blank. Presets are catalog-only ([A1](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12)); estimators consume them on the estimate C panel ([37ah](../tasks/37ah-spec-threshold-presets-estimate-ui.md)). Type/unit locked when value-bearing rows exist |
| 6 | **Detail — category nodes** | **No spec Fields** — pure organizational grouping |
| 7 | **Create** | Toolbar **New root** + **New child** (child requires selected tree node) |
| 8 | **Delete** | Block when referenced (`site_scope`, `estimate_scope`, `item_category`, `part_category`, `manufacturer_part_spec`, children) — structured `ConflictError` |
| 9 | **Search** | Filter tree by **`name`** contains (client-side or `q` param flattening matches — v1 client filter OK) |
| 10 | **CSI** | `csi_code` on category — **optional**, editable on detail when manifest grants; not list column v1 |
| 11 | **Labor phases** | **`item_labor_phase`** matrix on **category** (defaults) + **item** (leaf override). Org catalogs: `labor_phase`, `labor_rate_type`. Effective set = **per-phase merge** across full ancestry (leaf → root; nearest row per `labor_phase_id` wins) — not atomic whole-group swap ([37ad](../tasks/37ad-labor-phase-per-row-override.md)). Catalog DTO exposes `resolved_labor_phase` with per-row `origin` (`own` \| `inherited`) + source; own rows stay writable via `item_labor_phase`. Explicit exclusion = own override with `hours_per_unit = 0`. Empty ancestry + no own rows → *No labor phases configured on this node.* + **Add labor phase**. Estimate scope/zone picks **included** phases for recalc + job seed. Retired: `phase_template`. |

---

## A — Identity

### `category_list`

| Key | Value |
|-----|-------|
| `surface_id` | `category_list` |
| Pair | list pane for `category_detail` |
| Route | `/categories` — `categories/layout.tsx` |
| API | `GET /api/categories/tree` |
| Nav group | Catalog |
| Anchor table | `category` |
| All tables (DAL) | `category` (nested read) |
| Shipped vs target | **New** (task 37d) |

**List shape:** nested **tree DTO**, not paginated flat rows. List Surface still owns **`create`** for POST new category (root or child).

### `category_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `category_detail` |
| Pair | detail pane for `category_list` |
| Route | `/categories/[id]` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/categories/[id]` |
| Anchor table | `category` |
| All tables (DAL) | `category`, `spec_def`, `spec_option`, `category_spec_def`; roots also write `spec_def` / `spec_option` |
| Shipped vs target | **New** (task 37d) |

---

## B — Fields

### `category_list`

| Field id | Type | Writable | Notes |
|----------|------|----------|-------|
| `tree` | collection (nested) | read | Full forest — all roots + nested `children[]` |

**Tree node (read projection):**

```json
{
  "id": "<uuid>",
  "name": "Fire Alarm",
  "parent_id": null,
  "sort_order": 1,
  "is_root": true,
  "children": [
    {
      "id": "<uuid>",
      "name": "Initiating",
      "parent_id": "<root-id>",
      "sort_order": 1,
      "is_root": false,
      "children": []
    }
  ]
}
```

**No flat `summary` row** — tree replaces list columns. Optional **`q`** query filters nodes by name (implementation may prune non-matching branches or dim non-matches — v1: hide non-matching subtrees client-side after full load).

### `category_detail`

| Field id | Type | Writable | When | Notes |
|----------|------|----------|------|-------|
| `profile` | scalar | read + write | always | `name`, `sort_order`, `parent_id` (read), `csi_code`, commercial FKs (040b) |
| — | — | — | — | **No spec Field on leaf items** *(37ai, 2026-07-12)* — `spec_participation` and `item_spec_participation` removed entirely; leaves have nothing spec-related to author |
| — | — | — | — | **`spec_definitions` lives on scope roots only** *(37o)* — categories and leaf items show no spec Fields here |
| — | — | — | — | **No `part_pool` v1** — assign parts on `/parts/[id]` via `item_links` ([37j](../tasks/37j-catalog-part-authoring.md)) |

**Omit on detail v1:** writable part pool / `part_item` assignment on this Surface; duplicate subtree. List pane owns drag reparent; detail keeps parent TreeSelect.

### `profile` element

```json
{
  "id": "<uuid>",
  "name": "FPLR",
  "parent_id": "<parent-uuid>",
  "parent_name": "Speaker wire",
  "root_category_id": "<root-uuid>",
  "root_category_name": "Fire Alarm",
  "sort_order": 2,
  "csi_code": "",
  "default_phase_template_id": null,
  "is_root": false
}
```

- **`root_category_id` / `root_category_name`:** denormalized read — ancestor root for nested nodes (spec namespace).
- **`default_phase_template_id`:** writable on POST/PATCH **only when** `parent_id IS NULL`; reject on nested nodes.

### `spec_definitions` element (scope roots only, 37o UI pivot + 37af presets)

**Read DTO** — flat namespace owned by the scope root (`spec_def` where `scope_root_item_id` = this item):

```json
{
  "id": "<uuid>",
  "display_name": "Candela",
  "value_type": "enum",
  "unit_id": null,
  "unit_symbol": null,
  "decimal_places": null,
  "sort_order": 1,
  "options": [
    { "id": "<uuid>", "display_name": "135", "sort_order": 1 }
  ],
  "presets": [
    {
      "id": "<uuid>",
      "label": "High",
      "sort_order": 1,
      "option_ids": ["<uuid>"],
      "value_number": null,
      "value_number_max": null
    }
  ],
  "in_use_part_count": 0
}
```

- **`options[]`:** enum defs only — `spec_option` rows for this def.
- **`presets[]`:** threshold shortcuts ([37af](../tasks/37af-spec-threshold-presets-catalog-ui.md)). **Enum** presets use `option_ids[]` (junction `spec_threshold_preset_option`); numeric columns stay null. **Number** presets use `value_number` / `value_number_max` in the def's **display unit** on GET/PATCH (DAL stores canonical); `option_ids` is empty. **Boolean** defs omit presets (`[]`). Author in the Specs tab **Details** popover only ([A1](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12)).
- **Visibility:** scope roots only — categories and leaf items return no `spec_definitions` Field.
- **`in_use_part_count` only** *(37ai, 2026-07-12)* — `in_use_participation_count` dropped; nothing left to count once `item_spec_participation` is gone.

**PATCH:** `spec_definitions[]` replace-array on scope roots. Enum diff-upserts `options[]` and `presets[]`; rejects empty enum preset option sets, orphan `option_ids`, and in-use preset/option deletes ([T2/T9](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12)).

### No `spec_participation` element (removed, 37ai — 2026-07-12)

Leaf items (`node_type = item`) render **no spec section**. There is nothing to select and no `item_spec_participation` table to select it into. See [decision V1–V8](../decisions/catalog.md#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12): an item's effective spec set for estimate/part narrowing is simply its scope root's entire `spec_definitions` namespace — computed, not authored, and not shown on `item_detail` at all. The signal for "does dimension X matter to this device" now lives entirely on the **part** — see [`part.md`](./part.md) `part_specs`.

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `category_list` | `read` | grant on list | Each GET tree |
| `category_list` | `create` | grant on list | Each POST |
| `category_detail` | `read` | grant on detail | Each GET |
| `category_detail` | `write` | grant on detail + Field | Each PATCH / POST |
| `category_detail` | `delete` | grant on detail | Each DELETE |

**Field grants (v1):** single **`write`** on detail covers `profile`. `spec_definitions` write is its own grant, scope-root nodes only. **No `spec_participation` grant** *(37ai)* — the Field no longer exists.

**403 vs 404:** platform default.

---

## D — DAL read

### `category_list`

- **`listTree(ctx)`** — load all `category` rows; nest by `parent_id`; order siblings by `sort_order`, `id`.
- **Roots first** in top-level array order by `sort_order`.
- **No pagination** v1 — org category count expected modest; revisit if perf issue.

### `category_detail`

- **`get(ctx, id)`** — load category row; compute `is_root`, `root_category_id`, labels walking ancestors.
- **If scope root** — load `spec_definitions[]` from `spec_def` where `scope_root_item_id = id`.
- **If category or leaf item** *(37ai)* — no spec Fields returned at all; nothing to compute, nothing to walk.

**Picker API (37c):** **`listRoots(ctx)`** — `SELECT id, name FROM category WHERE parent_id IS NULL ORDER BY sort_order` — may live on same route module or `GET /api/categories/roots`.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`name`, `parent_id` optional), optional `spec_definitions` (scope roots only) | Insert category; root when `parent_id` null/omitted |
| `patch` | manifest-narrowed `profile`, `spec_definitions` | Scalar profile; **replace-array** collection |
| `delete` | — | Hard delete when allowed |

**Create root:** POST with `profile.name`, no `parent_id`.

**Create child:** POST with `profile.name`, `profile.parent_id` = selected node (must exist).

**`spec_definitions` (37o):** definition CRUD (`spec_def` + `options[]` + `presets[]`, enum diff-upsert, `spec_option_in_use` block) on `item_detail`'s own Specs tab, scope roots only — reject PATCH on any other `node_type`.

**No `spec_participation` write path** *(37ai)* — removed; there is no PATCH body key for it anymore.

**Strict writable schemas:** `.strict()` on POST/PATCH.

**Sibling `sort_order`:** list-pane drag sets `parent_id` + `sort_order` via immediate PATCH on drop (single-node `sort_order` v1); detail form still exposes manual `sort_order` when manifest grants write.

---

## F — Domain rules

### Delete blockers (`ConflictError` `{ code: in_use }`)

| Blocker | Table / rule |
|---------|----------------|
| Child categories | Must delete or reparent children first (v1: **block** if `category.parent_id` references this id) |
| Site scope | `site_scope.root_category_id` |
| Estimate scope | `estimate_scope.root_category_id` |
| Item / part links | `item_category`, `part_category` |
| Delete scope root with defs in its namespace | Block — list sample `spec_def.display_name`; delete/reassign defs on this Surface's Specs tab first (37o) |

### Root vs nested PATCH guards

| Rule | Server |
|------|--------|
| `spec_definitions` PATCH on non-scope node | **Reject** — 400 |
| Nested PATCH `default_phase_template_id` | **Reject** — 400 |

### Audit

Mutations on `category`, `spec_def`, `spec_option`. **No `item_spec_participation` audit** *(37ai)* — table removed.

---

## G — UI layout

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md). **List pane = antd `Tree`**, not `Table`.

```text
┌─ /categories ─────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New root | New child | Save | Revert | Delete        │
├─ Tree (list pane) ──────────────┬─ Detail pane ───────────────────────┤
│ ▼ Fire Alarm                    │  Profile                            │
│   Initiating                    │    Name [________]                  │
│   Wire                          │    Sort order [__]                  │
│     FPLR ●                      │  (no spec section — leaf item, 37ai)│
│ ▼ Intrusion                     │                                     │
│                                 │                                     │
└─────────────────────────────────┴─────────────────────────────────────┘
```

- **Bold** = scope root (`node_type === "scope"`).
- **●** = quotable leaf indicator (`node_type === "item"`).
- **Tree drag** — reorder siblings (gap drop) or reparent as last child (drop on `scope` / `category`); immediate PATCH + toast; independent of detail **Save**.

| Control | Behavior |
|---------|----------|
| **Tree select** | Sets detail route `/categories/[id]`; highlights node |
| **Tree drag** | When `item_detail` grants write on `profile`: gap = sibling reorder; drop on node = reparent under target; PATCH `{ profile: { parent_id, sort_order } }` on drop; toast feedback; disabled while name filter active |
| **New root** | Navigate to `/categories/new?returnTo=…`; **Save** on detail form (POST with no `parent_id`) |
| **New child** | Enabled when tree node selected (`MasterDetailSelectionContext` ref at click; pathname id fallback on deep link); navigate to `/categories/new?returnTo=…&parent_id=<id>`; **Save** includes `parent_id` |
| **Save** | Create: POST then `/categories/[id]`; edit: PATCH detail Fields; list tree refetch on success |
| **Cancel** (create) | Dirty confirm; navigate to sanitized `returnTo` |
| **Delete** | DELETE; on success clear detail or select parent |

**Empty detail:** placeholder *“Select a category”* when no selection.

**Leaf detail (37ai, 2026-07-12):** no spec section — nothing to select, nothing to display. **Category detail:** no spec section, unchanged. **Scope root detail:** Specs tab (`spec_definitions`) only.

**Pattern reuse:** Tree chrome similar to [`SiteGeographyTree`](../../components/sites/SiteGeographyTree.tsx) but **read-only structure in list** with **select** (not site PATCH); detail is standard `SurfaceFormRoot`.

---

## H — API routes

| Method | Path | Surface | Notes |
|--------|------|---------|-------|
| GET | `/api/categories/tree` | `category_list` | Nested tree |
| GET | `/api/categories/roots` | `category_list` | Flat roots — site/estimate pickers (37c) |
| GET | `/api/categories/[id]` | `category_detail` | |
| POST | `/api/categories` | `category_list` `create` | Body → new id |
| PATCH | `/api/categories/[id]` | `category_detail` | |
| DELETE | `/api/categories/[id]` | `category_detail` | |

---

## I — Edge cases

| Topic | Handling |
|-------|----------|
| **Empty catalog** | Tree shows empty state + **New root** CTA |
| **Delete root with children** | Block with message — delete children first |
| **Delete root in use on site** | Block — list sample `site_scope.name` |
| **Rename root** | Allowed; site scopes keep FK — display names on site come from instance `name`, not catalog root |
| **Wire under FA tree** | Valid nested category under Fire Alarm root ([C15](../planning/11-categories-scope-model.md)) |
| **Duplicate names** | Allowed among siblings (disambiguate by path); optional unique per parent deferred |

---

## J — Verify (task 37d stop gate)

- [x] YAML + `codegen:check` for `category_list` / `category_detail`
- [x] DAL tree read + root CRUD + spec_def/participation replace-array
- [x] UI: tree list pane + detail profile + root specs + nested participation
- [x] `GET /api/categories/roots` for catalog admin (site picker uses `GET /api/sites/pickers/category-roots`)
- [x] Delete blocker tests
- [x] Nav: Catalog → Categories

---

## Related tasks

- [37a](../tasks/37a-category-scope-decision-dbml-migration.md) — DDL / DBML
- [37b](../tasks/37b-category-scope-migration-apply.md) — apply `033`
- [37d](../tasks/37d-category-catalog-dal-surfaces.md) — implementation
- [37c](../tasks/37c-site-scopes-zones.md) — consumes root picker via `GET /api/sites/pickers/category-roots`
- [37o](../tasks/37o-spec-participation-flatten.md) — **complete** — `spec_definitions` on scope root's Specs tab; flattened `spec_participation` to leaf-only, no inheritance ([decision](../decisions/catalog.md#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07))
- [37ai](../tasks/37ai-spec-participation-removal.md) — **pending** — removes `spec_participation` / `item_spec_participation` outright; leaf narrowing uses scope-root namespace directly ([decision](../decisions/catalog.md#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12))
