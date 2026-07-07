# Catalog — `item_list` · `item_detail`

> **Wave:** 3b · **Status:** shipped (37i unified tree + 37g commercial + **37l leaf-quotable**, 2026-07-06) · **Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **DBML:** `item`, `item_labor_phase`, `spec_def`, … · **Decisions:** [unified item tree](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) · [commercial costing](../decisions/catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04)
>
> **Note:** Former `category_*` surfaces renamed to `item_*` (040a). **`item.node_type`** (`scope` \| `category` \| `item`, 044) gates authoring + estimate picker (leaves only). Commercial block on `item_detail`: policy FKs on branches; `fallback_unit_cost` + `item_labor_phase` on quotable leaves.

**Related:** [`part.md`](./part.md) — part pool assignment (`part_item`) is authored on **`part_detail.item_links`** v1; **`item_detail` omits writable `part_pool`**. Site scope picker reads **root items** ([`site.md`](./site.md) task 37c).

---

## Locked product answers (2026-06-30)

| # | Topic | Choice |
|---|--------|--------|
| 1 | **Scope roots** | `category.parent_id IS NULL` — Fire Alarm, Intrusion, HVAC, … |
| 2 | **List pane** | **Tree**, not flat table — full org category forest in list-detail **left pane** |
| 3 | **Detail — all nodes** | **`name`**, `sort_order` editable; **`node_type`** badge + promote/demote (`category` ↔ `item`); **`parent_id`** reparent within same scope root (non-quotable parents only) |
| 4 | **Detail — nested nodes** | **`spec_participation`** — visible defs per [owner-branch knowledge](../decisions/catalog.md#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03); read-only def unless owner; participates toggle on inherited / exclude |
| 5 | **Detail — root nodes** | **`spec_definitions`** — CRUD for defs visible at root (owned here + unassigned namespace); defs assigned only on descendant branches hidden |
| 6 | **Create** | Toolbar **New root** + **New child** (child requires selected tree node) |
| 7 | **Delete** | Block when referenced (`site_scope`, `estimate_scope`, `item_category`, `part_category`, `manufacturer_part_spec`, children) — structured `ConflictError` |
| 8 | **Search** | Filter tree by **`name`** contains (client-side or `q` param flattening matches — v1 client filter OK) |
| 9 | **CSI** | `csi_code` on category — **optional**, editable on detail when manifest grants; not list column v1 |
| 10 | **Phase template** | **Retired 040b** — use `item_labor_phase` matrix instead |

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
| `spec_definitions` | collection | read + write | **`is_root`** | Replace-array `spec_def[]` with nested `options[]` for enum defs |
| `spec_participation` | collection | read + write | nested (+ optional root) | **Participates** per root-namespace def → assign / branch exclude |
| — | — | — | — | **No `part_pool` v1** — assign parts on `/parts/[id]` via `item_links` ([37j](../tasks/37j-catalog-part-authoring.md)) |

**Omit on detail v1:** writable part pool / `part_item` assignment on this Surface; drag reparent; duplicate subtree.

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

### `spec_definitions` element (root only)

```json
{
  "id": "<uuid>",
  "code": "slc_protocol",
  "display_name": "SLC protocol",
  "value_type": "enum",
  "filter_mode": "required",
  "sort_order": 1,
  "options": [
    {
      "id": "<uuid>",
      "code": "fire_lite_litespeed",
      "display_name": "Fire-Lite LiteSpeed",
      "sort_order": 1
    }
  ],
  "value_text": null,
  "value_boolean": null
}
```

- **`value_type`:** `enum` \| `boolean` \| `text` \| **`number`** — enum uses `options[]`; boolean/text/number omit options. **`number`** requires `unit` ([decision](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02)).
- **`filter_mode`:** stored; when bucket value is non-blank, participating defs must match ([C10](../planning/11-categories-scope-model.md)); `prefer` scoring deferred.

### `spec_participation` element (nested; optional on root)

**Read DTO** — one row per root-namespace def (nested shows read-only def fields + participates):

```json
{
  "participates": [
    {
      "spec_def_id": "<uuid>",
      "display_name": "SLC protocol",
      "value_type": "enum",
      "active": true,
      "state": "inherited"
    },
    {
      "spec_def_id": "<uuid>",
      "display_name": "Color",
      "value_type": "enum",
      "active": false,
      "state": "excluded"
    }
  ]
}
```

- **`active`:** participates in **effective** set at this node.
- **`state`:** `assigned` \| `inherited` \| `excluded` \| `inactive` — UI hint only; not persisted. **Visibility:** GET returns only defs the node [knows](../decisions/catalog.md#decision-category-spec-visibility--owner-branch-knowledge-2026-07-03) (owner branch; exclude node; not below exclude; unassigned namespace at scope root only).

**Per-node visibility (37d4):**

| Node vs def `D` | In GET response? | Def editable? |
|-----------------|------------------|---------------|
| Owner | yes | yes |
| Descendant on path (uses) | yes | read-only |
| Exclude node (knows, does not use) | yes | read-only; participates toggle |
| Below exclude | no | — |
| Ancestor / sibling / other branch | no | — |
| Unassigned namespace def | scope root only | yes at root |

**PATCH:** `participates[]` replace-array — each `{ spec_def_id, active }`. Maps to assign (`category_spec_def`), exclude (`category_spec_exclude`), or delete rows per [assign-once decision](../decisions/catalog.md#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03). At most one assignment per `spec_def_id` globally. **No re-include** below an ancestor exclude.

**Effective set:** computed — not persisted.

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `category_list` | `read` | grant on list | Each GET tree |
| `category_list` | `create` | grant on list | Each POST |
| `category_detail` | `read` | grant on detail | Each GET |
| `category_detail` | `write` | grant on detail + Field | Each PATCH / POST |
| `category_detail` | `delete` | grant on detail | Each DELETE |

**Field grants (v1):** single **`write`** on detail covers `profile`, `spec_definitions`, `spec_participation` — no per-Field split until IAM needs it.

**403 vs 404:** platform default.

---

## D — DAL read

### `category_list`

- **`listTree(ctx)`** — load all `category` rows; nest by `parent_id`; order siblings by `sort_order`, `id`.
- **Roots first** in top-level array order by `sort_order`.
- **No pagination** v1 — org category count expected modest; revisit if perf issue.

### `category_detail`

- **`get(ctx, id)`** — load category row; compute `is_root`, `root_category_id`, labels walking ancestors.
- **If root:** load visible `spec_def` + `spec_option` for `root_category_id = id` (owner-branch filter).
- **If nested:** load visible root-namespace defs + computed `participates[]` per assign-once algorithm.

**Picker API (37c):** **`listRoots(ctx)`** — `SELECT id, name FROM category WHERE parent_id IS NULL ORDER BY sort_order` — may live on same route module or `GET /api/categories/roots`.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`name`, `parent_id` optional), optional `spec_definitions` / `spec_participation` | Insert category; root when `parent_id` null/omitted |
| `patch` | manifest-narrowed `profile`, `spec_definitions`, `spec_participation` | Scalar profile; **replace-array** collections |
| `delete` | — | Hard delete when allowed |

**Create root:** POST with `profile.name`, no `parent_id`.

**Create child:** POST with `profile.name`, `profile.parent_id` = selected node (must exist).

**PATCH `spec_definitions`:** scope root or **owning** nested category only — replace-array `spec_def` + nested `options`; cascade delete removed defs only when owner or unassigned; reject edits to defs owned elsewhere (`owner_only`). **Enum options:** diff upsert by `id` — update in place, insert new, delete only unreferenced; **block** removal of options referenced by `manufacturer_part_spec` (`spec_option_in_use`).

**PATCH `spec_participation`:** `participates[]` replace-array — assign-once + branch exclude; reject duplicate assign, re-include below exclude, overlap on same node.

**Strict writable schemas:** `.strict()` on POST/PATCH.

**Sibling `sort_order`:** v1 manual numeric on profile; tree DnD reorder deferred.

---

## F — Domain rules

### Delete blockers (`ConflictError` `{ code: in_use }`)

| Blocker | Table / rule |
|---------|----------------|
| Child categories | Must delete or reparent children first (v1: **block** if `category.parent_id` references this id) |
| Site scope | `site_scope.root_category_id` |
| Estimate scope | `estimate_scope.root_category_id` |
| Item / part links | `item_category`, `part_category` |
| Part specs | `manufacturer_part_spec` referencing defs under this root (roots only) |
| Spec participation | Other categories’ `category_spec_def` referencing defs (when deleting spec_def on root PATCH omit) |

### Root vs nested PATCH guards

| Rule | Server |
|------|--------|
| Nested node PATCH `spec_definitions` | **Reject** — 400 |
| Assign same `spec_def_id` at second category | **Reject** — 400 (`assign_once_violation`) |
| Re-include def below ancestor exclude | **Reject** — 400 |
| Nested PATCH `default_phase_template_id` | **Reject** — 400 |

### Audit

Mutations on `category`, `spec_def`, `spec_option`, `category_spec_def`.

---

## G — UI layout

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md). **List pane = antd `Tree`**, not `Table`.

```text
┌─ /categories ─────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New root | New child | Save | Revert | Delete        │
├─ Tree (list pane) ──────────────┬─ Detail pane ───────────────────────┤
│ ▼ Fire Alarm            [root]  │  Profile                            │
│   Initiating                    │    Name [________]                  │
│   Wire                          │    Sort order [__]                  │
│     FPLR                        │  ── Spec participation ──           │
│ ▼ Intrusion             [root]  │    ☑ SLC protocol                   │
│                                 │    ☐ Notification color             │
│                                 │  (root only: Spec definitions table) │
└─────────────────────────────────┴─────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| **Tree select** | Sets detail route `/categories/[id]`; highlights node |
| **New root** | Navigate to `/categories/new?returnTo=…`; **Save** on detail form (POST with no `parent_id`) |
| **New child** | Enabled when tree node selected (`MasterDetailSelectionContext` ref at click; pathname id fallback on deep link); navigate to `/categories/new?returnTo=…&parent_id=<id>`; **Save** includes `parent_id` |
| **Save** | Create: POST then `/categories/[id]`; edit: PATCH detail Fields; list tree refetch on success |
| **Cancel** (create) | Dirty confirm; navigate to sanitized `returnTo` |
| **Delete** | DELETE; on success clear detail or select parent |

**Empty detail:** placeholder *“Select a category”* when no selection.

**Root detail — spec definitions:** inline table — `display_name`, `value_type`, enum options editor.

**Nested detail — spec participation:** read-only copy of root def table + **Participates** checkbox per row.

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
