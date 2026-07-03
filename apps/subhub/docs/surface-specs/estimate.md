# Estimates — `estimate_list` · `estimate_detail`

> **Wave:** 4e · **Status:** backbone + **37e scope tab** (2026-07-02) · **Implementation:** [task 32](../tasks/32-estimate-wave-4e.md) wave 4e; [task 37e](../tasks/37e-estimate-scope-tab.md) scope tab · **Planning:** [`02-estimates.md`](../planning/02-estimates.md) · **Catalog:** [`surfaces.md`](../surfaces.md#estimate_list--estimate_detail) · **DBML:** `estimate`, `estimate_party`, `estimate_scope`, `estimate_zone`, `estimate_line` · **Decisions:** [scope tab](../decisions/estimate.md#decision-estimate-scope-tab--junction-zones-general-scope-row-block-uncheck-2026-07-02), [site anchor](../decisions/estimate.md#decision-estimate-site-anchor--gate-lines-immutable-after-create-2026-06-30)

**Related:** Site anchor via `profile.site_id` → [`site_detail`](./site.md). Stakeholder catalog: [`job-party-relation.md`](./job-party-relation.md). Win → job copy in wave **4b** → [`job.md`](./job.md). Catalog `system` / `system_spec_def` seeded in migration `031`.

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

### List + detail

Master-detail: list in `estimates/layout.tsx`, detail in `[id]/page.tsx` ([`routing-and-libraries.md`](../routing-and-libraries.md)).

```text
┌──────────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New | Save | Revert | Win | Lose | Delete … │
├──────────────────────────────────────────────────────────────┤
│ profile — title, site picker, dates, status (read-only)      │
│ ── Stakeholders ──                                           │
│ stakeholders (field array or compact table)                  │
│ ── Line items (tree) ──  *(tab hidden until site selected)*  │
│ [ Add system ]                                               │
│ antd Table treeData — General + system parents + line leaves │
│ ── footer ── total ext sell                                  │
└──────────────────────────────────────────────────────────────┘
```

**Shared component:** `EstimateDetailForm` + `EstimateLineTreeTable` (4e); prior flat `EstimateLineItemsField` retired or refactored.

### Tree table — row kinds (4e)

| `rowKind` | Backing | Parent? | Columns |
|-----------|---------|---------|---------|
| `general` | Synthetic — not persisted | Yes | Label “General”; `colSpan` all columns; collapse |
| `system` | `estimate_system` + nested `specs` | Yes | System name; optional expanded spec fields; `colSpan` when collapsed |
| `line` | `estimate_line` | Leaf | Full line column set (kind, description, qty, …) |

**4c′ adds:** `area` parent rows under `system` (`estimate_area`); lines may attach to `system` or `area`.

### Tree shape (4e example)

```text
▼ General                          [colSpan — chrome only]
    line: Mobilization
▼ Fire Alarm                       [colSpan — specs in expanded row when defs exist]
    line: Pull station  qty 10
    line: Horn/strobe   qty 4
▼ CCTV
    line: Camera        qty 6
```

Persisted: `systems[]` + flat `line_items[]` with `estimate_system_id` (`null` = General).

### Add / delete (client until Save)

| Action | Control | Behavior |
|--------|---------|----------|
| **Add system** | Toolbar **“Add system”** → catalog picker (excludes systems already on quote) | Insert `system` parent row; empty children |
| **Add line** | **“+ Line” on focused parent** — parent row actions: *Add line here* | Append leaf under `general` or `system` parent; set `estimate_system_id` from parent |
| **Delete parent** | Row delete on parent | Remove parent + all descendant lines from form state |
| **Delete line** | Row delete on leaf | Remove line only |
| **Focus parent** | Click parent row (highlight, not checkbox) | “Add line” targets last-focused parent; default General when none focused |

**Not used in 4e:** row selection checkboxes; multi-select bulk delete (defer).

### Specs in tree

When `system_spec_def` rows exist for catalog `system`: **expand** system parent → spec `Select`s in expanded area above child lines. PATCH nested in `systems[].specs`. When zero defs: no expand content for specs (panel hidden).

### Line leaf columns

| Column | Line rows | Notes |
|--------|-----------|-------|
| Kind | `Select` | product / labor / expense |
| Description | `Input` | indent when `kit_component` |
| Item / part / phase | `Select` or text | kind-dependent |
| Qty | `InputNumber` | |
| Unit | `Input` | |
| Cost | `InputNumber` | `unit_cost` |
| Sell | `InputNumber` | `unit_price` |
| Ext sell | read-only | qty × sell |
| Actions | delete | cascade kit header |

**Add behavior (unchanged intent):**

| Control | Result |
|---------|--------|
| Add line | Empty standalone row under focused parent |
| Add item | Seed from catalog; assembly expands to component lines |
| Add kit | Header + default components under focused parent |

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
| `systems` | Add system (toolbar) | Catalog `system` list — **hidden until `site_id` set** | No system rows when ROM-only |
| `line_items` | Add line on focused parent | Item catalog when `item_list` ships; `part_id` when manifest grants — **Line Items tab hidden until `site_id` set** | "No lines" under General |

**Site-first gating:** Line Items tab and `systems` picker appear only when `profile.site_id` is non-empty in form state (create) or loaded DTO (edit). Stakeholders are **not** gated. When line items read is granted but no site: secondary hint on General tab — *"Select a site to add line items."*

**Stakeholders:** replace-array on Save; duplicate `(party_id, relation_id)` inline error.

**Systems:** replace-array on Save; duplicate `system_id` inline error.

**Kit delete:** removing header removes components client-side before Save; DAL rejects orphan `kit_component` rows.

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
