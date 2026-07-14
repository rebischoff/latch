# Estimates — `estimate_list` · `estimate_detail`

> **Wave:** 4e · **Status:** backbone + **37y condition-only commercial tree** (2026-07-09); **37aa** live preview + dual locks (**complete** 2026-07-11) · **Implementation:** [task 32](../tasks/32-estimate-wave-4e.md) wave 4e; [task 37w](../tasks/37w-estimate-line-items-panels.md) three-panel shell; [task 37x](../tasks/37x-estimate-conditions-allocations.md) (superseded for roots); [task 37y](../tasks/37y-condition-only-commercial-tree.md) condition forest; [task 37aa](../tasks/37aa-estimate-line-live-preview.md) live preview · **Planning:** [`02-estimates.md`](../planning/02-estimates.md) · **Catalog:** [`surfaces.md`](../surfaces.md#estimate_list--estimate_detail) · **DBML:** `estimate`, `estimate_party`, `estimate_condition`, `estimate_line`, `estimate_line_allocation` · **Decisions:** [dual locks + live preview](../decisions/estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11), [condition-only tree Y1–Y5](../decisions/estimate.md#decision-condition-only-commercial-tree-2026-07-09), [scope / condition / zone / qty](../decisions/estimate.md#decision-estimate-scope-condition-zone-and-line-qty-2026-07-09), [three-panel layout](../decisions/estimate.md#decision-estimate-line-items-tab--three-panel-layout-2026-07-08), [site anchor](../decisions/estimate.md#decision-estimate-site-anchor--gate-lines-immutable-after-create-2026-06-30)

**Related:** Site anchor via `profile.site_id` → [`site_detail`](./site.md). Stakeholder catalog: [`job-party-relation.md`](./job-party-relation.md). Win → job copy in wave **4b** → [`job.md`](./job.md).

---

## Locked product answers (37v — 2026-07-08)

> **UI superseded (2026-07-08)** by [37w three-panel layout](../tasks/37w-estimate-line-items-panels.md) — see [decision W1](../decisions/estimate.md#w1--shell-topology-locked). **Retained at DAL:** scopes, lines, include rules, persistence. **Supersedes UI of:** [37e scope tab](../tasks/37e-estimate-scope-tab.md). **Decision:** [Line Items merge](../decisions/estimate.md#decision-estimate-line-items-tab--merge-scope-config-into-line-tree-2026-07-08) (V1–V8). Historical **4e `systems` / General** vocabulary below is **retired in UI** — persisted shape is `scopes[]` + `line_items[]`.

| # | Topic | Choice |
|---|--------|--------|
| **V1** | Tabs | **General \| Line Items** only — **Scope tab retired** |
| **V2** | Tree parents | `scope` / `zone` parent rows (`colSpan`); line leaves; unzoned lines under scope; **≥1 scope required** per line |
| **V3** | Include | Toolbar **Add scope ▾**; scope header **Add zone ▾**; tree = included scopes/zones only; estimate PATCH does **not** create site geography; empty site scopes → CTA to site |
| **V4** | Bucket config | **⚙ Popover** on scope + zone parents — `EstimateScopeSpecFields`, `EstimateScopeLaborPhaseFields`, complexity picker |
| **V5** | Summary chips | **Deferred** |
| **V6** | Kits | **UI removed** — standalone lines only; DAL kit validation unchanged |
| **V7** | Persistence | Unchanged — dirty until Save; `replaceEstimateCollectionsTx` |
| **V8** | Line-level specs | **Deferred** (O5) |

---

## Locked product answers (2026-06-29, 4e)

| # | Topic | Choice |
|---|--------|--------|
| 1 | **System blocks** | **Optional.** Flat `line_items` without any `estimate_system` always valid (ROM/mobilization). Same quote may mix flat General lines + one or more system blocks. |
| 2 | **Persisted shape** | **Flat** `estimate_line` rows always; tree parents (`general`, `system`) are **presentation** only. |
| 3 | **Line editor layout** | **Ant Design `Table` with `treeData`** — parent rows for **General** and each **system** block; line rows are leaves. Parent rows use **full-row `colSpan`**; not row-selectable; collapsible. *(4c′ adds `area` parents under `system`.)* |
| 4 | **Quote geography** | **`estimate_area` only** (4c′ DDL) — lines FK `estimate_area_id`; no quote-level assets. **4e:** no geography FK on lines; `estimate_system_id` only. Estimate DAL **does not write** `site_area` / `site_asset` while quoting. |
| 5 | **`quote_sections`** | **Defer v1** — `estimate_section` dropped; commercial CSI buckets orthogonal to system blocks. |
| 6 | **Add from catalog** | **Expand on add** — standalone `item` → one line; `assembly` → visible component lines; package → `kit_header` + `kit_component` ([decision](../decisions/estimate.md#decision-estimate-line-editor--expand-on-add-and-grouped-table-ui-2026-06-23)) |
| 7 | **`stakeholders`** | Same replace-array pattern as wave 4a; relation from `job_party_relation_table` |
| 8 | **`systems` + specs** | One `estimate_system` per catalog `system_id` per estimate (max one block each). Nested `systems[].specs[]` on PATCH. Spec UI **hidden** when zero `system_spec_def` for that catalog `system`; when visible, inline in **expanded system parent row**. |
| 9 | **`material_status`** | DAL column only in 4e (`generic` \| `suggested` \| `verified`); no UI. |
| 10 | **`site_system_id`** | Always **`null`** on create/patch in 4e. Link/copy deferred to 4c′ / win. |
| 11 | **Win → job** | Reconcile quote **areas** → `site_area` at win (4b). `site_asset` on site at install / `job.complete` — not from quote asset rows. |
| 12 | **List / create / delete** | Unchanged from 4a — list columns `title`, site name, `status`, `estimate_date`; POST `title` + `site_id`; hard delete `draft` only when allowed |
| 13 | **Site anchor (task 33)** | `profile.site_id` required on create; **writable create only** — read-only + open icon after first save; DAL rejects PATCH `site_id` change; Line Items tab + `systems` picker gated on non-empty `site_id`; create: changing site clears `systems` + `line_items` |

**Supersedes (4a):** flat-only line grid; `estimate_section_id` / `site_location_id` on lines; grouped-by-place toggle keyed off `site_section` / `site_location`; proposed `site_location` writes on estimate Save.

---

## A — Identity

### `estimate_list`

| Key | Value |
|-----|-------|
| `surface_id` | `estimate_list` |
| Pair | list pane for `estimate_detail` |
| Route | `/estimates` — `estimates/layout.tsx` |
| API | `GET /api/estimates` |
| Nav group | Sales |
| Anchor table | `estimate` |
| All tables (DAL) | `estimate`; join `site` for site name |
| Shipped vs target | **Shipped** (4a); list unchanged in 4e |

### `estimate_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `estimate_detail` |
| Pair | detail pane for `estimate_list` |
| Route | `/estimates/[id]` — `id` = `estimate.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/estimates/[id]` |
| Anchor table | `estimate` |
| All tables (DAL) | `estimate`, `estimate_line`, `estimate_party`, `estimate_system`, `estimate_system_spec`; joins `site`, catalog `system`, `system_spec_def`, `system_spec_option`, `job_party_relation`, `party`, optional catalog labels (`phase`, `item`, `manufacturer_part`) |
| Shipped vs target | **4a shipped** — **4e retarget** on backbone DDL (`028`–`031`) |

**Retired tables (app):** `estimate_section`, `site_location` — dropped in migration `030` / `029`.

---

## B — Fields

### `estimate_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `estimate.id`, `title`, `status`, `estimate_date`, `site.name` | Site name as `site_display_name` in DTO |

**List search:** `title` (case-insensitive contains).

**Default sort:** `estimate_date` desc nulls last, then `title` asc.

**Pagination:** `limit` / `offset` on `GET /api/estimates`.

### `estimate_detail`

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | `title`, `site_id`, `status`, `estimate_date`, `valid_until`, `source_estimate_id`, `category_id` | `status` read-only except via `win`/`lose` actions; **`site_id` writable create only** — read-only + link after first save ([decision](../decisions/estimate.md#decision-estimate-site-anchor--gate-lines-immutable-after-create-2026-06-30)) |
| `stakeholders` | collection | read + write | `estimate_party` | `party_id`, `relation_id`, `sort_order` |
| `systems` | collection | read + write | `estimate_system` + nested `estimate_system_spec` | Logical Field — `columns: []` in YAML; see below |
| `line_items` | collection | read + write | `estimate_line` | Flat persist; tree UI parents are not separate Fields |

**Omit in wave 4 v1:** `quote_sections`, `notes`, `attachments`.

**4c′ follow-on:** `estimate_area` collection / line FK `estimate_area_id` — not a Field in 4e.

### Scalar — `profile` (read DTO excerpt)

```json
{
  "title": "Fire alarm — Building A TI",
  "site_id": "<uuid>",
  "site_display_name": "1200 Commerce Dr",
  "status": "draft",
  "estimate_date": "2026-06-15",
  "valid_until": null,
  "source_estimate_id": null,
  "category_id": null
}
```

Writable PATCH keys: manifest-narrowed subset of above; **`status`** not writable via PATCH body (actions only). **`site_id`** not patchable after estimate row exists — DAL `ConflictError` `{ code: "site_id_immutable" }`.

### Collection — `stakeholders` element

```json
{
  "party_id": "<uuid>",
  "display_name": "Tower West LLC",
  "kind": "organization",
  "relation_id": "<uuid>",
  "relation_label": "Customer",
  "sort_order": 0
}
```

Unique: `(estimate_id, party_id, relation_id)`.

### Collection — `systems` element (read DTO)

```json
{
  "id": "<uuid>",
  "system_id": "<catalog system id>",
  "system_name": "Fire Alarm",
  "sort_order": 1,
  "specs": [
    {
      "system_spec_def_id": "<uuid>",
      "def_display_name": "SLC Protocol",
      "value_type": "enum",
      "system_spec_option_id": "<uuid>",
      "option_display_name": "LiteSpeed",
      "value_text": null,
      "value_boolean": null
    }
  ]
}
```

Read path merges catalog `system_spec_def` rows for each `system_id` with saved `estimate_system_spec` (defs with no saved row appear with null values).

### Collection — `systems` element (writable PATCH)

```json
{
  "id": "<uuid optional on create>",
  "system_id": "<catalog>",
  "sort_order": 1,
  "specs": [
    {
      "system_spec_def_id": "<uuid>",
      "system_spec_option_id": "<uuid>",
      "value_text": null,
      "value_boolean": null
    }
  ]
}
```

**`site_system_id`:** not writable in 4e — always persisted `null`.

### Collection — `line_items` element

```json
{
  "id": "<uuid>",
  "line_number": 1,
  "sort_order": 1,
  "line_role": "standalone",
  "line_kind": "product",
  "description": "Horn/strobe — corridor",
  "quantity": 4,
  "unit": "ea",
  "unit_cost": 125.0,
  "unit_price": 185.0,
  "estimate_system_id": null,
  "material_status": null,
  "phase_id": null,
  "item_id": null,
  "part_id": null,
  "vendor_part_id": null,
  "parent_line_id": null
}
```

**`estimate_system_id`:** `null` = General bucket (ROM / quote-wide lines). Must match a `systems[].id` in the same PATCH payload when set.

**`material_status`:** optional; DAL persists when sent; no 4e UI.

**Dropped from DTO (4e):** `estimate_section_id`, `site_location_id`.

**4c′ adds:** `estimate_area_id` (quote-owned area; not `site_area_id` on quote).

**Replace-array** on Save with `profile`, `stakeholders`, `systems`, and `line_items`. Client sends full ordered arrays; DAL assigns `line_number` / `sort_order` from `line_items` array order.

**Kit rows:** `line_role` `kit_header` | `kit_component`; `parent_line_id` → header `id`. Delete header → omit components in same PATCH or DAL cascades omit.

**Labor lines:** `line_kind = labor`; `phase_id` required when catalog exists; `part_id` null.

**Product lines:** `part_id` optional when MPN pinned; `phase_id` null.

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `estimate_list` | `read` | grant on list | Each GET list |
| `estimate_detail` | `read` | grant on detail | Each GET |
| `estimate_detail` | `write` | grant on detail + Field | Each PATCH / POST |
| `estimate_detail` | `delete` | grant on detail | Each DELETE |
| `estimate_detail` | `win` | grant on detail | Each win action |
| `estimate_detail` | `lose` | grant on detail | Each lose action |

**List create:** `GET /api/estimates` → `estimate_list` `read`; `POST` create → `estimate_detail` `write`.

**Field grants:** wave 4 v1 — single `write` covers `profile`, `stakeholders`, `systems`, `line_items`. Per-Field split deferred.

**403 vs 404:** platform default.

---

## D — DAL read

### `estimate_list`

- **`list(ctx, { limit, offset, q? })`** — anchor `estimate`; join `site` for `site_display_name`.
- **Search:** `q` matches `estimate.title` (case-insensitive contains).

### `estimate_detail`

- **`get(ctx, id)`** — project granted Fields only.
- **`profile`** — join `site.name` as `site_display_name`.
- **`stakeholders`** — join `party`, `job_party_relation.display_name` as `relation_label`.
- **`systems`** — all `estimate_system` rows for estimate ordered by `sort_order`; join catalog `system.name` as `system_name`; for each block, load `estimate_system_spec` and merge with `system_spec_def` (+ `system_spec_option` labels for enum values). Include defs with no saved spec row (null values).
- **`line_items`** — all rows for estimate ordered by `sort_order`; SELECT `estimate_system_id`, `material_status`; join optional labels (`phase.name`, `item.name`, `manufacturer_part.mpn`) when ids set and caller has catalog read grants.
- **Catalog `system` picker:** read-only list from `system` table (seeded in `031`); enrichment on GET detail or small picker query in estimate DAL — no `system_table` Surface in 4e.

**No site geography read enrichment for line editor parents in 4e** — `area` parents ship in 4c′ (`estimate_area`).

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`title`, `site_id`), optional `stakeholders`, optional `systems`, optional `line_items` | Insert `estimate` status `draft`; validate `site_id` exists |
| `patch` | manifest-narrowed `profile`, `stakeholders`, `systems`, `line_items` | Scalar profile keys; collections replace-array; **`profile.site_id` immutable** — reject change with `ConflictError` `{ code: "site_id_immutable" }` |
| `delete` | — | Hard delete when allowed; pre-check job reference when `won` |
| `win` | — | Set `status = won`; create `job` + copy parties/lines (4b — when job slice ready) |
| `lose` | — | Set `status = lost` |

### `systems` replace-array

1. Upsert by `id` (omit `id` on create → insert new `estimate_system`).
2. Delete omitted `estimate_system` rows and their `estimate_system_spec` children (hard delete).
3. Reject duplicate `system_id` within one estimate (`ValidationError`).
4. **`systems[].specs`** — replace per block; one row per `system_spec_def_id`.
5. **`site_system_id`** — always write `null` in 4e.

### `line_items` replace-array

1. Replace all lines; reindex `line_number` / `sort_order` from array order.
2. Each `estimate_system_id` must be `null` or match a block `id` in the payload `systems` array.
3. Persist `material_status` when sent; no UI validation in 4e.

### `line_items` validation (minimum)

| Rule | Enforce |
|------|---------|
| `line_kind` | `product` \| `labor` \| `expense` |
| `line_role` | `standalone` \| `kit_header` \| `kit_component` |
| Kit integrity | Every `kit_component.parent_line_id` references a header in the same payload |
| `estimate_system_id` | Null or references a `systems[]` block in payload |
| `phase_id` | Labor lines only when phase catalog exists |
| Snapshot | Persist `description`, `quantity`, `unit`, `unit_cost`, `unit_price` as sent — catalog ids optional |
| `material_status` | When set: `generic` \| `suggested` \| `verified` |

### Site tables — no writes on estimate Save

Estimate PATCH **must not** INSERT/UPDATE `site_area`, `site_asset`, or `site_system`. Quote geography is estimate-owned (`estimate_area` in 4c′); site as-built is reconciled at win (4b). See [quote geography decision](../planning/02-estimates.md#decision-quote-geography--estimate-owned-tree-reconcile-at-win-2026-06-29).

**Delete blockers:**

| Condition | Error |
|-----------|-------|
| `status = won` and `job` references estimate | `ConflictError` `{ type: 'job' }` |

**Transactions:** `patch()` orchestrates `systems` then `line_items` in one transaction; audit on registered tables.

---

## F — Domain rules

- **Site anchor** — every estimate has `site_id`; quote structure uses optional **`estimate_system`** blocks keyed to catalog `system` ([`02-estimates.md`](../planning/02-estimates.md)). **`site_id` locked after first POST** — quote scope is property-scoped; stricter than job site change.
- **General bucket** — `estimate_system_id = null` for ROM, mobilization, and quote-wide lines.
- **One block per catalog system** — at most one `estimate_system` row per `system_id` per estimate.
- **Commercial vs system blocks** — `estimate_section` retired; do not confuse catalog `system` blocks with CSI commercial rollups (still deferred).
- **Snapshots** — line commercial fields are frozen on save; catalog price changes do not rewrite saved quotes ([general decision](../decisions/general.md#decision-line-item-snapshots-on-estimate--job--invoice-2026-06-12)).
- **Win → job (4b)** — copy `site_id`, parties, lines, system blocks + spec snapshots; **reconcile** quote `estimate_area` → `site_area` (not in 4e). `site_asset` created on site at install / `job.complete` — not from quote-level asset entities.
- **Site delete** — blocked when estimate references site ([`site.md`](./site.md) § E).
- **Audit:** all mutations on registered tables (`estimate`, `estimate_line`, `estimate_party`, `estimate_system`, `estimate_system_spec`).

---

## G — UI layout

### Tabs (37w)

| Tab | Content |
|-----|---------|
| **General** | `profile`, `stakeholders`; hint when no site selected — default (omit `tab`) |
| **Line Items** | Three-panel **S** / **C** / **LI** layout — gated on non-empty `site_id`; URL `?tab=line-items` |

Same-surface list navigation preserves `tab` via `buildDetailHref`. When Line Items is unavailable, carried `?tab=line-items` falls back to General and the URL is cleaned.

**Scope tab retired (37e/37v).** Bucket config + line editing live on **Line Items** ([37w](../tasks/37w-estimate-line-items-panels.md)).

### List + detail

Master-detail: list in `estimates/layout.tsx`, detail in `[id]/page.tsx` ([`routing-and-libraries.md`](../routing-and-libraries.md)).

```text
┌──────────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New | Save | Revert | Win | Lose | Delete … │
├──────────────────────────────────────────────────────────────┤
│ Tabs: General | Line Items                                   │
├──────────────────────────────────────────────────────────────┤
│ Line Items tab (desktop three-panel):                        │
│ ┌──────────────────────┬──────────────────────┐              │
│ │ S — Structure        │ C — Configuration    │              │
│ ├──────────────────────┴──────────────────────┤              │
│ │ LI — flat line table (full width) + Places…  │              │
│ │ FieldArrayTable-style Add line footer        │              │
│ └──────────────────────────────────────────────┘              │
│ ── footer ── total ext sell (visible bucket)               │
└──────────────────────────────────────────────────────────────┘
```

**Shared components:** `EstimateDetailForm` + `EstimateLineItemsPanels` (`EstimateQuoteStructureTree`, `EstimateBucketConfigurePanel`, `EstimateLineFlatTable`, `EstimateLinePlacesButton`).

### Three panels (37w topology · 37y content)

| Panel | Id | Role |
|-------|-----|------|
| **S** | structure | Estimate-owned **condition forest** — Add root ▾ / Add condition / Delete (X1 block if lines); names edit in **C** |
| **C** | config | Bound to **S** selection — **name**, **complexity**, labor phases, **include discontinued**, specs on every node; child inherit checkboxes (Y4) |
| **LI** | lines | Flat **37f** column grid; filtered by **S** selection; **Add line** footer; **Places…** allocations |

### Selection → LI filter (37y Y5)

| **S** selection | **LI** shows | New line targets |
|-----------------|--------------|------------------|
| **Condition** | Lines with matching `estimate_condition_id` (selected node only) | Same condition |

**S** selection is **client-only** (not persisted). Default on load: first root condition. Add-line gated until a condition is selected.

### Commercial tree (37y Y1 / Y5)

Tree is **estimate-owned condition forest** — roots carry `root_item_id` (catalog root); children nest via `parent_condition_id`. Site geography is place-only via line **Places…** / `estimate_line_allocation`.

Empty forest → prompt to **Add root** (catalog root picker).

### Add / delete (client until Save)

| Action | Control | Behavior |
|--------|---------|----------|
| **Select node** | **S** tree click | Filters **LI**; binds **C** |
| **Configure** | **C** panel fields | Name; complexity; labor phases; **include discontinued** (default off); specs — child inherit checkboxes |
| **Add line** | **LI** dashed **Add line** footer | Append standalone row for selected condition |
| **Places** | **Places…** on line | Allocations (default qty 1); `qty_manual` sync rules (G3/X3) |
| **Delete node** | **S** Delete | Blocked if lines reference node or descendants (X1) |
| **Delete line** | Row delete in **LI** | Remove line only |

**Not in 37y:** kit UI; summary chips; win→job condition/allocation copy (X4); LI drag→**S** retarget (deferred).

### Line columns (37f / LI · **37aa dual locks + preview**)

| Column | Notes |
|--------|-------|
| Item | `TreeSelect` — root category subtree for condition tree’s `root_item_id`; change → **server line-preview** (that line); blocked when `material_locked` |
| Part | `Select` or text — resolver / preview; manual PN → `material_locked` |
| Description | `Input` |
| Qty | `InputNumber` — updates **ext sell** only (no unit costing preview) |
| Unit | `Input` |
| Material / Freight / Incidental / Labor | read-only — preview + save snapshots |
| Target / Cost | read-only |
| Sales lock / Material lock | independent booleans (replace `lock` enum) — see [P1–P7](../decisions/estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11) |
| Sell | `InputNumber` — editable even when sales-locked; manual edit → `sales_locked` |
| Ext sell | read-only — qty × sell |
| Actions | delete |

**Live preview (37aa):** `POST` batch line-preview (1..n) on item/part/config — no persist. Config change on selected condition previews **all** lines under that condition.

**Kit UI removed (37v).** PATCH emits `line_role: standalone` only.

### Superseded UI (37v / 37w site-tree — historical)

37v used a single `Table` with `treeData` — scope/zone parent rows + Configure **Popover**. 37w kept three panels but bound **S** to `site_tree`. **37x** replaces commercial `estimate_zone*` with estimate-owned conditions + allocations.

---

## H — UI chrome

| Priority | Action | Handler | When enabled |
|----------|--------|---------|--------------|
| 1 | Save | PATCH `estimate_detail` | dirty + `write` |
| 2 | Revert | reset form | dirty |
| 3 | New (list) | POST create | list `write` |
| 4 | Win | `win` action | `draft` or `sent`; `win` grant |
| 5 | Lose | `lose` action | not `won`; `lose` grant |
| 6 | Delete | DELETE | `draft` + `delete` grant |

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `estimate_detail` | `/sites/[id]` | `site_id` set + `site_detail` `read` |
| `estimate_list` | `/estimates/[id]` | row click |
| `site_detail` | `/estimates?site_id=` | **Deferred** — filter deferred v1 |

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `profile.site_id` | — | [`LinkedSelectInput`](../../components/form/LinkedSelectInput.tsx) — site list; **`… Add site`** last option when `site_detail` `write` + field writable → `/sites/new` + picker return ([decision](../decisions/estimate.md#decision-estimate-site-anchor--gate-lines-immutable-after-create-2026-06-30), [linked picker](../decisions/general.md#decision-linked-picker-control-linkedselectinput--2026-06-24)); **create:** writable select; **edit:** read-only label + open icon when `site_detail` `read` | Required on create |
| `stakeholders` | Add stakeholder | Any `party`; relation from `job_party_relation_table` | "No stakeholders" |
| `scopes` | Implicit include on **C** edit or **Add line** | **S** panel selects `site_tree` scope/zone — **does not create site geography** | CTA to `/sites/[id]` when site has zero scopes |
| `line_items` | **Add line** footer in **LI** panel | Item `TreeSelect` scoped to line's `estimate_scope`; part resolver — **Line Items tab hidden until `site_id` set** | "Select a scope or zone" / bucket-specific empty copy per W3 |

**Site-first gating:** Line Items tab appears only when `profile.site_id` is non-empty. Stakeholders are **not** gated. When line items read is granted but no site: hint on General tab — *"Select a site to add scopes and line items."*

**Scopes:** replace-array on Save; implicit include on line/config edit. **C** panel edits dirty client-side until Save.

**Stakeholders:** replace-array on Save; duplicate `(party_id, relation_id)` inline error.

**Drag reorder:** defer; use `sort_order` from array order on Save v1.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create | POST | `draft`; `title` + `site_id` required |
| Edit profile | PATCH | scalar keys; **`site_id` must not change** on existing row |
| Edit lines / systems | PATCH | replace-array `systems`, `line_items` |
| Send (manual) | PATCH `status` → `sent` | **Optional v1** |
| Win | `win` action | `won` + job create (4b) |
| Lose | `lose` action | `lost` |
| Expire | batch or manual | `expired` — defer automation v1 |
| Delete | DELETE | `draft` when no blocking job |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **No site selected (create)** | Line Items tab absent; `systems` picker hidden; stakeholders still editable; hint on General tab when line items read granted |
| **Site change on create** | Changing `profile.site_id` to a different id (or clearing to `""`) clears `systems` and `line_items` in form state; first pick from empty does not clear |
| **ROM / no systems** | Valid once site selected — General parent only; all lines `estimate_system_id = null`; **site still required** on POST |
| **Mixed quote** | General lines + one or more system blocks in same estimate |
| **Line without catalog ids** | Valid — description + qty + cost + sell suffice |
| **Assembly expand** | One PATCH may grow line count; client generates temp keys until save |
| **Kit header sell rollup** | Header may show sell; components may have own costs — ext sell sums all lines unless UI hides components from rollup (defer print rules) |
| **Won estimate edit** | **Block** `line_items` / `systems` PATCH when `won` — v1 immutable |
| **`part_id` without catalog read** | Store id; omit label in DTO |
| **Zero spec defs** | System parent row has no spec expand content; block still valid |
| **Remove system parent** | Client-only until Save; PATCH omit ⇒ DAL hard-deletes block + its lines |
| **`estimate_area` (4c′)** | Quote-owned area tree under each system; Import from site; line FK `estimate_area_id` — **deferred** |
| **Import from site (4c′)** | Explicit action copies active `site_area` into `estimate_area`; **not** auto on add system |
| **Demo route** | `/estimates/demo` retired when production tree editor ships |

---

## Implementation waves

| Wave | Deliverable |
|------|-------------|
| **4a** ✅ | DDL (legacy); YAML; DAL; `/estimates` list+detail; flat `line_items`; stakeholders |
| **4e** | Backbone alignment — `systems` + specs; tree line editor; `estimate_system_id` + `material_status`; drop legacy `estimate_section_id` / `site_location_id` app code |
| **4c′** | `estimate_area` DDL/UI; `area` parent rows; Import from site; `estimate_area_id` on lines |
| **4b** | `win` / `lose`; area reconcile → `site_area`; job copy |
| **4c** | Deeper grouped editor polish |
| **4d′** | Shared line editor + `item` pickers |
| **Later** | `quote_sections`; drag reorder; revision chain UI |

---

## Verify (stop gate)

### 4a (complete)

- [x] Locked answers reflected in decisions + spike (2026-06-23)
- [x] A–K complete for flat 4a
- [x] YAML + `codegen:check` for `estimate_list` / `estimate_detail`
- [x] DAL read/write + API routes
- [x] Production UI — flat `line_items` (2026-06-23)

### 4e (task 32)

- [x] Spec amended for backbone — `systems`, tree UI, DTO contracts (2026-06-29)
- [x] YAML + `codegen:check` — `systems` logical Field (2026-06-29)
- [x] DAL read — `systems` + merged specs; `line_items` backbone columns (2026-06-29)
- [x] DAL write — `systems` replace-array + nested specs; no site geography writes (2026-06-29)
- [x] Tree UI — General + system parents; line leaves; parent `colSpan` (2026-06-29)
- [x] `job_line` DAL — `site_area_id` / `site_asset_id`; drop `site_location` (2026-06-29)
- [x] ROM (General only) + mixed quote round-trip (2026-06-29)
- [ ] `win` → job copy (4b)

### Task 33 (site anchor)

- [x] Line Items tab + systems picker gated on non-empty `profile.site_id` (2026-06-30)
- [x] `profile.site_id` writable create only; read-only + open icon on edit (2026-06-30)
- [x] DAL rejects PATCH `site_id` change — `ConflictError` `{ code: "site_id_immutable" }` (2026-06-30)
- [x] `LinkedSelectInput` + `… Add site` picker return on create (2026-06-30)
- [x] Create: changing or clearing site resets `systems` + `line_items` (2026-06-30)
- [x] `codegen:check` + targeted tests + build (2026-06-30)
