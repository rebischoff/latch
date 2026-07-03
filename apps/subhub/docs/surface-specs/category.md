# Catalog — `category_list` · `category_detail`

> **Wave:** 3b · **Status:** target spec (2026-06-30) · **Implementation:** [task 37d](../tasks/37d-category-catalog-dal-surfaces.md) · **Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **DBML:** `category`, `spec_def`, `spec_option`, `category_spec_def` · **Decisions:** [category-only scope](../decisions/catalog.md#decision-category-only-scope--roots-replace-catalog-system-2026-06-30)
>
> **Replaces:** catalog `system` admin + flat `category_table` placeholder in [00-scan.md](./00-scan.md).

**Related:** [`part.md`](./part.md) · [`item.md`](./item.md) *(deferred)* — items/parts link via M:N `item_category` / `part_category` (37d DAL only; assignment UI deferred). Site scope picker reads **root categories** ([`site.md`](./site.md) task 37c).

---

## Locked product answers (2026-06-30)

| # | Topic | Choice |
|---|--------|--------|
| 1 | **Scope roots** | `category.parent_id IS NULL` — Fire Alarm, Intrusion, HVAC, … |
| 2 | **List pane** | **Tree**, not flat table — full org category forest in list-detail **left pane** |
| 3 | **Detail — all nodes** | **`name`**, `sort_order` editable; **`parent_id`** read-only (reparent deferred v1) |
| 4 | **Detail — nested nodes** | **`spec_participation`** — **inherit** parent effective set; **include** / **exclude** deltas → `category_spec_def` / `category_spec_exclude` ([decision](../decisions/catalog.md#decision-category-spec-participation--inherit-include-exclude-2026-07-02)) |
| 5 | **Detail — root nodes** | **`spec_definitions`** — CRUD `spec_def` + nested `spec_option`; **`spec_participation`** — base includes on root (`category_spec_def`) |
| 6 | **Create** | Toolbar **New root** + **New child** (child requires selected tree node) |
| 7 | **Delete** | Block when referenced (`site_scope`, `estimate_scope`, `item_category`, `part_category`, `manufacturer_part_spec`, children) — structured `ConflictError` |
| 8 | **Search** | Filter tree by **`name`** contains (client-side or `q` param flattening matches — v1 client filter OK) |
| 9 | **CSI** | `csi_code` on category — **optional**, editable on detail when manifest grants; not list column v1 |
| 10 | **Phase template** | `default_phase_template_id` on **root only** — optional FK; J5 fallback when item has no template |

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
| `profile` | scalar | read + write | always | `name`, `sort_order`, `parent_id` (read), `csi_code`, `default_phase_template_id` (**root only**) |
| `spec_definitions` | collection | read + write | **`is_root`** | Replace-array `spec_def[]` with nested `options[]` for enum defs |
| `spec_participation` | collection | read + write | always | **Root:** base includes → `category_spec_def`. **Nested:** read inherited + write includes / excludes ([decision](../decisions/catalog.md#decision-category-spec-participation--inherit-include-exclude-2026-07-02)) |

**Omit on detail v1:** `item_category` / `part_category` assignment UI (separate item/part surfaces); drag reparent; duplicate subtree.

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

### `spec_participation` element (root + nested)

**Read DTO** (nested example):

```json
{
  "inherited": [
    { "spec_def_id": "<uuid>", "display_name": "SLC protocol", "value_type": "enum" }
  ],
  "includes": [
    { "spec_def_id": "<uuid>", "display_name": "Color", "value_type": "enum", "active": true }
  ],
  "excludes": [
    { "spec_def_id": "<uuid>", "display_name": "SLC protocol", "value_type": "enum", "active": true }
  ]
}
```

**PATCH (nested):** `includes[]` and `excludes[]` replace-array → `category_spec_def` / `category_spec_exclude`. Each `spec_def_id` must belong to **`root_category_id`**. Cannot list the same def in both arrays.

**PATCH (root):** `includes[]` only → base `category_spec_def` on root; `excludes[]` rejected v1 unless manifest extended.

**Effective set:** computed per [inheritance decision](../decisions/catalog.md#decision-category-spec-participation--inherit-include-exclude-2026-07-02) — not persisted.

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
- **If root:** load `spec_def` + `spec_option` for `root_category_id = id`.
- **If nested:** load `category_spec_def` joined to `spec_def` for labels; load root’s defs for participation picker source (read-only list on client or second query).

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

**PATCH `spec_definitions`:** root only — replace-array `spec_def` + nested `options`; cascade delete removed defs/options not in payload (when unreferenced).

**PATCH `spec_participation`:** root — `includes[]` only (base `category_spec_def`); nested — `includes[]` + `excludes[]` replace-array; reject overlap and `spec_def_id` not under root namespace; reject `excludes` on root.

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
| Root PATCH `spec_participation` `excludes` | **Reject** — 400 |
| Root PATCH `spec_participation` `includes` | Allowed — base set |
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

**Root detail — spec definitions:** inline table or sub-form — `display_name`, `value_type`, enum options editor (minimal v1: name + options list).

**Nested detail — spec participation:** checklist of root’s `spec_def` rows (participating defs for part filter on items in this category).

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
