# Catalog — `item_list` · `item_detail`

> **Wave:** 3b · **Status:** shipped (37i unified tree + 37g commercial + **37l leaf-quotable**, 2026-07-06); spec Fields **pending 37o** (2026-07-07) · **Planning:** [11-categories-scope-model.md](../planning/11-categories-scope-model.md) · **DBML:** `item`, `item_labor_phase`, `spec_def`, `item_spec_participation`, … · **Decisions:** [unified item tree](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) · [commercial costing](../decisions/catalog.md#decision-commercial-costing--org-tables-category-defaults-estimate-overrides-2026-07-04) · [labor phase inclusion](../decisions/catalog.md#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07) ([37n](../tasks/37n-labor-phase-inclusion.md)) · [spec participation flatten](../decisions/catalog.md#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07) ([37o](../tasks/37o-spec-participation-flatten.md))
>
> **Note:** Former `category_*` surfaces renamed to `item_*` (040a). **`item.node_type`** (`scope` \| `category` \| `item`, 044) gates authoring + estimate picker (leaves only). Commercial block on `item_detail`: policy FKs on **scope/category**; **`item_labor_phase`** on **category** (defaults) + **item** (override); `fallback_unit_cost` on quotable leaves. **Specs (37o + UI pivot 2026-07-08):** `spec_definitions` on scope roots (**Specs** tab); leaf **`spec_participation`** as multi-select labeled **Specs** on **General** tab. **Categories carry no spec Fields.** `spec_def.code` / `spec_option.code` dropped (048) — matching uses FK ids only. **Next (37p–37r):** value types `enum` \| `boolean` \| `number` \| `range` (drop `text`); org `spec_unit` table; options popover editor — see [decision](../decisions/catalog.md#decision-spec-value-types-units-table-and-locks-2026-07-08).

**Related:** [`part.md`](./part.md) — part pool assignment (`part_item`) is authored on **`part_detail.item_links`** v1; **`item_detail` omits writable `part_pool`**. [`spec.md`](./spec.md) *(37o, new)* — **primary editing Surface** for `spec_def` / `spec_option`; `item_detail` only consumes it (leaf `spec_participation` picks from the owning scope's namespace). Site scope picker reads **root items** ([`site.md`](./site.md) task 37c).

---

## Locked product answers (2026-06-30)

| # | Topic | Choice |
|---|--------|--------|
| 1 | **Scope roots** | `category.parent_id IS NULL` — Fire Alarm, Intrusion, HVAC, … |
| 2 | **List pane** | **Tree**, not flat table — full org category forest in list-detail **left pane** |
| 3 | **Detail — all nodes** | **`name`**, `sort_order` editable; **`node_type`** badge + promote/demote (`category` ↔ `item`); **`parent_id`** reparent within same scope root (non-quotable parents only) |
| 4 | **Detail — leaf items** | **`spec_participation`** *(37o)* — multi-select labeled **Specs** on **General** tab against the ancestor scope's `spec_def` namespace; direct opt-in rows in `item_spec_participation`; no inheritance |
| 5 | **Detail — scope roots** | **`spec_definitions`** *(37o UI pivot)* — **Specs** tab: sortable `FieldArrayTable` (Name, Type, Unit, Decimals, Options). Types: `enum` \| `boolean` \| `number` \| `range` (no `text`). Unit picker from org `spec_unit_table`; options **popover** editor (rename preserves option `id`). Type/unit locked when `in_use_part_count` &gt; 0 |
| 6 | **Detail — category nodes** | **No spec Fields** — pure organizational grouping |
| 7 | **Create** | Toolbar **New root** + **New child** (child requires selected tree node) |
| 8 | **Delete** | Block when referenced (`site_scope`, `estimate_scope`, `item_category`, `part_category`, `manufacturer_part_spec`, children) — structured `ConflictError` |
| 9 | **Search** | Filter tree by **`name`** contains (client-side or `q` param flattening matches — v1 client filter OK) |
| 10 | **CSI** | `csi_code` on category — **optional**, editable on detail when manifest grants; not list column v1 |
| 11 | **Labor phases** | **`item_labor_phase`** matrix on **category** (defaults) + **item** (leaf override). Org catalogs: `labor_phase`, `labor_rate_type`. Leaf with no own rows **inherits** first ancestor's group (read-only table + source caption); leaf with no own rows and no ancestry shows *No labor phases configured on this node.* + **Add labor phase** (no editable table chrome). **Add labor phase** enters override mode; deleting all own rows reverts immediately to inherited or empty using cached `inherited_labor_phase` ([37n](../tasks/37n-labor-phase-inclusion.md)). Estimate scope/zone picks **included** phases for recalc + job seed. Retired: `phase_template`. |

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
| `spec_participation` | collection | read + write | **`node_type = item`** *(37o)* | Flat multi-select `{ spec_def_id }[]` against the ancestor scope's namespace ([`spec.md`](./spec.md)); replace-array into `item_spec_participation`; **no** inherited/exclude states |
| — | — | — | — | **`spec_definitions` moved off this Surface** *(37o)* — see [`spec_detail`](./spec.md); scope roots and categories show no spec Fields here |
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

### `spec_definitions` — moved (37o)

**Superseded here.** Definitions are authored on the new [`spec_detail`](./spec.md) Surface (`spec_def` + nested `options[]`), which carries its own `scope_root_id` picker — `item_detail` no longer hosts this Field on scope roots. See `spec.md` for the element shape.

### `spec_participation` element (leaf items only, 37o)

**Read DTO** — one row per def in the item's ancestor scope's namespace, flat (no inherited/excluded states):

```json
{
  "participates": [
    {
      "spec_def_id": "<uuid>",
      "display_name": "SLC protocol",
      "value_type": "enum",
      "active": true
    },
    {
      "spec_def_id": "<uuid>",
      "display_name": "Color",
      "value_type": "enum",
      "active": false
    }
  ]
}
```

- **`active`:** row exists in `item_spec_participation` for this item + def. That's the entire semantic — no `state`, no owner/exclude concepts.
- **Namespace source:** GET resolves the item's ancestor scope root (walk `parent_id`), then returns every `spec_def` where `scope_root_item_id` = that root, each flagged `active` per the item's own `item_spec_participation` rows.
- **Visibility:** only on `node_type = item` (leaf). Categories and scope roots return no `spec_participation` Field at all.

**PATCH:** `participates[]` replace-array — each `{ spec_def_id, active }`. `active: true` → upsert `item_spec_participation (item_id, spec_def_id)`; `active: false` / omitted → delete row if present. Reject `spec_def_id` outside the item's ancestor-scope namespace (`invalid_spec_namespace`). No assign-once check, no exclude semantics — this is a plain per-item toggle set.

**Authoring convenience (UI, not schema):** "Copy from item…" picker duplicates another item's `participates[]` as a starting point — a client-side convenience, not a stored relationship.

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `category_list` | `read` | grant on list | Each GET tree |
| `category_list` | `create` | grant on list | Each POST |
| `category_detail` | `read` | grant on detail | Each GET |
| `category_detail` | `write` | grant on detail + Field | Each PATCH / POST |
| `category_detail` | `delete` | grant on detail | Each DELETE |

**Field grants (v1):** single **`write`** on detail covers `profile`, `spec_participation` — no per-Field split until IAM needs it. `spec_definitions` grant lives on `spec_detail` (37o), not here.

**403 vs 404:** platform default.

---

## D — DAL read

### `category_list`

- **`listTree(ctx)`** — load all `category` rows; nest by `parent_id`; order siblings by `sort_order`, `id`.
- **Roots first** in top-level array order by `sort_order`.
- **No pagination** v1 — org category count expected modest; revisit if perf issue.

### `category_detail`

- **`get(ctx, id)`** — load category row; compute `is_root`, `root_category_id`, labels walking ancestors.
- **If leaf item (37o):** walk to ancestor scope root; load `spec_def` where `scope_root_item_id = root`; join `item_spec_participation` for this item to flag `active` — flat, no ancestor walk beyond finding the root once.
- **If scope root or category (37o):** no spec Fields returned — definitions live on `spec_detail`.

**Picker API (37c):** **`listRoots(ctx)`** — `SELECT id, name FROM category WHERE parent_id IS NULL ORDER BY sort_order` — may live on same route module or `GET /api/categories/roots`.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`name`, `parent_id` optional), optional `spec_participation` (leaves only) | Insert category; root when `parent_id` null/omitted |
| `patch` | manifest-narrowed `profile`, `spec_participation` | Scalar profile; **replace-array** collection |
| `delete` | — | Hard delete when allowed |

**Create root:** POST with `profile.name`, no `parent_id`.

**Create child:** POST with `profile.name`, `profile.parent_id` = selected node (must exist).

**`spec_definitions` — moved (37o):** definition CRUD (`spec_def` + `options[]`, enum diff-upsert, `spec_option_in_use` block) now lives on `spec_detail` — see [`spec.md`](./spec.md) § E.

**PATCH `spec_participation` (37o):** `participates[]` replace-array — plain upsert/delete against `item_spec_participation`; reject `spec_def_id` outside the item's ancestor-scope namespace (`invalid_spec_namespace`). **No** assign-once check, **no** exclude/re-include rules — every leaf item's participation is independent.

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
| Delete leaf item with participation rows | Cascade `item_spec_participation` — no blocker, just delete (37o) |
| Delete scope root with defs in its namespace | Block — list sample `spec_def.display_name`; delete/reassign defs on `spec_detail` first (37o) |

### Root vs nested PATCH guards

| Rule | Server |
|------|--------|
| `spec_definitions` PATCH on `item_detail` (any node) | **Reject** — 400; use `spec_detail` (37o) |
| `spec_participation` PATCH on non-leaf (`scope` \| `category`) | **Reject** — 400 |
| Nested PATCH `default_phase_template_id` | **Reject** — 400 |

### Audit

Mutations on `category`, `item_spec_participation` (37o). `spec_def` / `spec_option` audit moved to `spec_detail`.

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
│     FPLR ●                      │  ── Spec participation (leaf only) ─│
│ ▼ Intrusion                     │    ☑ SLC protocol                   │
│                                 │    ☐ Notification color             │
│                                 │  (specs edited on /specs — 37o)      │
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

**Leaf detail — spec participation (37o):** flat checkbox list against the ancestor scope's namespace (loaded from `spec_detail`'s tables); no read-only/inherited rows. **Scope root / category detail:** no spec section at all — link to `/specs?scope=<root-id>` when the user needs to manage the namespace.

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
- [37o](../tasks/37o-spec-participation-flatten.md) — **pending** — moves `spec_definitions` off this Surface to `spec_detail`; flattens `spec_participation` to leaf-only, no inheritance ([decision](../decisions/catalog.md#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07))
