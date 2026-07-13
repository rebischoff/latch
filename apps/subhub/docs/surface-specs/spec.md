# Catalog — `spec_list` · `spec_detail`

> **Status:** **Superseded** (2026-07-08). Content folded into [`item.md`](./item.md) — definitions edited on `item_detail` **Specs** tab (`spec_definitions` Field, scope roots only); interim `/specs` Surface retired. Retained for historical reference during 37o execution.
>
> **Further amendment (2026-07-12):** every reference below to `item_spec_participation` / leaf `spec_participation` (§5, § F) is **stale** — [37ai](../tasks/37ai-spec-participation-removal.md) drops that table and Field outright. See [decision V1–V8](../decisions/catalog.md#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12). This file is historical only; do not use it to implement anything.

> **Wave:** 3b (37o) · **Status:** **pending** (2026-07-07) · **Catalog:** [`surfaces.md`](../surfaces.md) · **DBML:** `spec_def`, `spec_option` · **Decision:** [spec participation flatten](../decisions/catalog.md#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07) · **Task:** [37o](../tasks/37o-spec-participation-flatten.md)

**Related:** [`item.md`](./item.md) — `item_detail` no longer edits `spec_def`/`spec_option`; leaf `spec_participation` reads (but does not write) this Surface's rows. [`part.md`](./part.md) — `part_specs` contextual union reads `item_spec_participation` for a part's linked items, unaffected by this Surface directly.

---

## Locked product answers (2026-07-07)

| # | Topic | Choice |
|---|--------|--------|
| 1 | **Why a separate Surface** | Definitions are no longer tied to any item-tree node's editing rights — they're a flat catalog scoped to a chosen scope root. A dedicated list+detail Surface makes that decoupling explicit, the same way `labor_phase` / `labor_rate_type` are their own catalogs rather than Fields bolted onto `item_detail`. |
| 2 | **Scope assignment** | `spec_detail.profile.scope_root_id` — a picker limited to `item` rows where `node_type = 'scope'`. Required on create; **not** editable after create if any `item_spec_participation` or `manufacturer_part_spec` rows reference the def (see § F) — reassigning a def's scope out from under live participation/compatibility rows is not a v1 flow. |
| 3 | **List shape** | Flat, filterable by scope — **not** a tree (unlike `item_list`). One row per `spec_def`. |
| 4 | **Enum options** | Nested collection on `spec_detail`, same shape as the prior root-only `spec_definitions` Field (diff-upsert by `id`; block removal of options referenced by `manufacturer_part_spec`). |
| 5 | **Participation** | **Not** on this Surface. Which items use a def lives on `item_detail.spec_participation` (leaf items only) — see [`item.md`](./item.md). |

---

## A — Identity

### `spec_list`

| Key | Value |
|-----|-------|
| `surface_id` | `spec_list` |
| Pair | list pane for `spec_detail` |
| Route | `/specs` — `specs/layout.tsx` |
| API | `GET /api/specs` |
| Nav group | Catalog |
| Anchor table | `spec_def` |
| All tables (DAL) | `spec_def`, join `item` for scope root label |
| Shipped vs target | **New** (37o) |

### `spec_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `spec_detail` |
| Pair | detail pane for `spec_list` |
| Route | `/specs/[id]` — `id` = `spec_def.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/specs/[id]` |
| Anchor table | `spec_def` |
| All tables (DAL) | `spec_def`, `spec_option`, join `item` (scope root label), read-only counts from `item_spec_participation` + `manufacturer_part_spec` for delete guard |
| Shipped vs target | **New** (37o) |

---

## B — Fields

### `spec_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `spec_def.id`, `display_name`, `value_type`, `scope_root_item_id`, scope root `name` | |

**List filter:** `scope_root_id` query param — narrows to one scope's namespace (used when navigating from `item_detail`'s "manage specs" link, or an estimate scope panel's "edit dimensions" link).

**List search:** `display_name`, `code`.

**List sort (default):** scope root `name`, then `sort_order`, then `display_name`.

### `spec_detail`

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|------------------------|-------|
| `profile` | scalar | read + write | `scope_root_id`, `code`, `display_name`, `value_type`, `sort_order` | `scope_root_id` locked after create when in use (§ F) |
| `options` | collection | read + write | `spec_option` | replace-array with diff-upsert semantics; enum defs only |

### `profile` element

```json
{
  "id": "<uuid>",
  "scope_root_id": "<item-uuid>",
  "scope_root_name": "Fire Alarm",
  "code": "slc_protocol",
  "display_name": "SLC protocol",
  "value_type": "enum",
  "sort_order": 1
}
```

- **`value_type`:** `enum` \| `boolean` \| `text` \| `number` — enum requires `options[]` non-empty; boolean/text/number omit `options`. **`number`** requires `unit` (deferred columns per [value-types decision](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02) — unchanged by 37o).
- **`scope_root_id`:** must reference an `item` row with `node_type = 'scope'` — reject otherwise (`invalid_scope_root`).

### `options` element

```json
{
  "id": "<uuid>",
  "code": "fire_lite_litespeed",
  "display_name": "Fire-Lite LiteSpeed",
  "sort_order": 1
}
```

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `spec_list` | `read` | grant on list | Each GET list |
| `spec_list` | `create` | grant on list | Each POST |
| `spec_detail` | `read` | grant on detail | Each GET |
| `spec_detail` | `write` | grant on detail | Each PATCH |
| `spec_detail` | `delete` | grant on detail | Each DELETE |

**Field grants (v1):** single `write` on detail covers `profile` + `options` — no per-Field split.

**Who needs this Surface:** catalog admins who define the taxonomy — typically a smaller set than everyone who edits `item_detail` leaf participation.

---

## D — DAL read

### `spec_list`

- **`list(ctx, { limit, offset, q?, scope_root_id? })`** — join `spec_def` → `item` for scope root label.
- **Search:** `q` matches `display_name` or `code`.
- **Sort:** scope root `name`, `sort_order`, `display_name`.

### `spec_detail`

- **`get(ctx, id)`** — load `spec_def` row + `spec_option` rows when `value_type = enum`; denormalize `scope_root_name`.
- **Delete-guard counts:** `COUNT(*)` from `item_spec_participation` and `manufacturer_part_spec` referencing this `spec_def_id` — surfaced in DTO as `in_use_participation_count` / `in_use_part_count` (read-only hint, not part of `profile`).

**Picker API:** `GET /api/specs/pickers/scope-roots` — `SELECT id, name FROM item WHERE node_type = 'scope' ORDER BY sort_order` (same query shape as the old `/api/categories/roots`).

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`scope_root_id`, `display_name`, `value_type` required), optional `options` | Insert `spec_def`; insert `spec_option` rows when enum |
| `patch` | manifest-narrowed `profile`, `options` | Scalar profile (see `scope_root_id` lock below); **replace-array** `options` with diff-upsert |
| `delete` | — | Block when `item_spec_participation` or `manufacturer_part_spec` reference this def (§ F) |

**Create:** `profile.scope_root_id`, `profile.display_name`, `profile.value_type` required. `options` required (non-empty) when `value_type = enum`; rejected (must be empty/omitted) otherwise.

**PATCH `profile.scope_root_id`:** allowed only when zero `item_spec_participation` and zero `manufacturer_part_spec` rows reference this def — otherwise reject (`scope_reassign_blocked`). Renaming/retyping (`display_name`, `value_type`) has no such lock — but changing `value_type` on a def with existing `manufacturer_part_spec` rows is a separate strict-validation concern (reject when incompatible rows exist; same posture as the prior root-owned model).

**PATCH `options`:** diff upsert by `id` — update in place, insert new, delete only unreferenced; **block** removal of an option referenced by `manufacturer_part_spec` (`spec_option_in_use`) — same rule as before, unchanged by 37o.

**Strict writable schemas:** `.strict()` on POST/PATCH.

---

## F — Domain rules

### Delete blockers (`ConflictError` `{ code: in_use }`)

| Blocker | Table | Sample label in payload |
|---------|-------|--------------------------|
| Item participation | `item_spec_participation` | item `name` / breadcrumb |
| Part compatibility | `manufacturer_part_spec` | part `mpn` |
| Estimate bucket values | `estimate_scope_spec` / `estimate_zone_spec` / `estimate_line_spec` | estimate number (rare — only if a def is deleted after estimates already captured values against it) |

**No blocker on scope root delete** — deleting an `item` scope root itself is guarded on the `item_detail` side (existing rule: block when in use); `spec_def` rows pointing at a deleted scope root would become orphaned FKs, so **item scope-root delete must additionally check for zero `spec_def` rows referencing it** (amend to [`item.md`](./item.md) § F delete blockers).

### Audit

Mutations on `spec_def`, `spec_option`.

---

## G — UI layout

Master-detail per [routing-and-libraries.md](../routing-and-libraries.md): flat list (not tree) in `specs/layout.tsx`, detail in `[id]/page.tsx`.

```text
┌─────────────────────────────────────────────────┐
│ SurfaceToolbar — New spec | Save | Delete        │
├───────────────────┬───────────────────────────────┤
│ spec_list         │  profile                       │
│ [scope filter ▾]  │    Scope root [TreeSelect: scope roots only] │
│ SLC protocol      │    Display name [____________] │
│ Color             │    Value type  [enum ▾]         │
│ Tonnage           │    Options (tags, enum only)    │
└───────────────────┴───────────────────────────────┘
```

**Create:** toolbar **New spec** → empty detail pane, `scope_root_id` required before first Save.

**Section order:** `profile` → `options` (hidden entirely when `value_type ≠ enum`).

---

## H — UI chrome

| Priority | Action | Handler |
|----------|--------|---------|
| 1 | Save | PATCH `spec_detail` |
| 2 | New spec (list) | navigate create → POST |
| 3 | Delete | confirm modal → DELETE; show in-use counts inline when blocked |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `spec_detail` | `/categories/[scope_root_id]` (i.e. `item_detail` on the scope root) | `scope_root_id` set + `item_detail` `read` |
| `item_detail` (leaf, `spec_participation` empty state) | `/specs?scope_root_id=<root>` | `spec_list` `read` — "Manage specs for this scope" |
| `item_detail` (leaf, `spec_participation` row) | `/specs/[id]` | per-row read-only link when `spec_detail` `read` |

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|--------------|
| `options` | **Add option** | — (free text `display_name` / `code`) | "No options — add at least one before saving an enum spec." |

### `profile` pickers

| Control | Picker | Notes |
|---------|--------|-------|
| Scope root | `item` rows where `node_type = 'scope'` (flat select, not tree) | Disabled on edit once in use (§ E) |

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create spec | POST | `scope_root_id` + `display_name` + `value_type` required; `options` required when enum |
| Reassign scope | PATCH `profile.scope_root_id` | Blocked once any participation/compatibility rows exist |
| Delete spec | DELETE | Blocked while `item_spec_participation` or `manufacturer_part_spec` reference it |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Migrating from owned/inherited model** | See [37o migration plan](../decisions/catalog.md#decision-spec-definitions-scoped-to-root-flat-item-participation--no-ownershipinheritance-2026-07-07) — `scope_root_item_id` backfilled by walking each legacy `spec_def.item_id` to its root; `item_spec_participation` backfilled from the old `effective()` output once, at migration time only |
| **Bulk "copy specs to sibling item"** | UI convenience on `item_detail.spec_participation` (copy another item's `participates[]`), not a Field on this Surface |
| **`number` value type** | Still deferred per [value-types decision](../decisions/catalog.md#decision-spec_def-value-types-and-part-matching-rules-2026-07-02) — unaffected by 37o |
| **Empty scope (no defs yet)** | `spec_list` filtered by a scope with zero rows shows empty state + **New spec** CTA pre-filled with that `scope_root_id` |

---

## Verify (stop gate)

- [ ] YAML + `codegen:check` for `spec_list` / `spec_detail`
- [ ] Migration `046` applied on dev; `current.dbml` synced
- [ ] DAL read/write + API routes
- [ ] Production UI — profile + options grid at `/specs`
- [ ] `item_detail.spec_participation` flattened to leaf-only, reads this Surface's namespace
- [ ] `part.md` `part_specs` contextual union re-verified against `item_spec_participation` (direct join, no ancestor walk)
- [ ] Delete blockers + scope-reassign lock tests
- [ ] Nav: Catalog → Specs
