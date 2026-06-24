# Estimates — `estimate_list` · `estimate_detail`

> **Wave:** 4 · **Status:** target spec (2026-06-23) · **Implementation:** [task 22](../tasks/22-estimate-wave-4a.md) wave 4a — **Prerequisite:** [`site.md`](./site.md) wave 1 shipped; grouped-by-place editor requires [`site-geography.md`](./site-geography.md) wave 2b · **Catalog:** [`surfaces.md`](../surfaces.md#estimate_list--estimate_detail) · **DBML:** `estimate`, `estimate_party`, `estimate_section`, `estimate_line`, `job_party_relation` · **Decisions:** [line grouping](../decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17), [line editor UI](../decisions/estimate.md#decision-estimate-line-editor--expand-on-add-and-grouped-table-ui-2026-06-23), [wave 4 ship order](../decisions/estimate.md#decision-estimate-wave-4--implementation-order-2026-06-23) · **Spike:** [`estimate-line-editor.md`](../spikes/estimate-line-editor.md), [`/estimates/demo`](http://localhost:3003/estimates/demo) (dev-gated fixture)

**Related:** Site anchor via `profile.site_id` → [`site_detail`](./site.md). Stakeholder catalog: [`job-party-relation.md`](./job-party-relation.md) (parallel to [`site-contact-relation.md`](./site-contact-relation.md)). Win → job copy in wave **5b** → [`job.md`](./job.md).

---

## Locked product answers (2026-06-23)

| # | Topic | Choice |
|---|--------|--------|
| 1 | Line editor default | **Flat** — single `line_items` antd `Table`; **grouped-by-place toggle** ships after wave 2b `sections` / `locations` on `site_detail` |
| 2 | Persisted shape | **Flat** `estimate_line` rows always; geography grouping and kits are **presentation** only |
| 3 | Add from catalog | **Expand on add** — standalone `item` → one line; `assembly` → visible component lines; package → `kit_header` + `kit_component` ([decision](../decisions/estimate.md#decision-estimate-line-editor--expand-on-add-and-grouped-table-ui-2026-06-23)) |
| 4 | Geography parents | Grouped view: **General** (null `site_location_id`), **Section**, **Location** parent rows — `colSpan` chrome only; line rows use full column set |
| 5 | `quote_sections` | **Defer v1** — commercial CSI buckets orthogonal to site geography; add when proposal rollup UI is prioritized |
| 6 | Pickers v1 | **Description-first lines** + optional static or minimal catalog hooks; full `item_id` / `part_id` / `phase_id` pickers when catalog Surfaces ship (`item.md`, `part.md`, `phase.md`) |
| 7 | `stakeholders` | **Include in wave 4** — same replace-array pattern as `site_contact`; relation from `job_party_relation_table` |
| 8 | `win` / `lose` | **Declare in policy**; `lose` sets status only; **`win` creates `job` + copies snapshots** when job slice (#21) ships — stub or 501 until then |
| 9 | List | Columns **`title`**, **site name**, **`status`**, **`estimate_date`**; search `title` contains; sort `estimate_date` desc then `title` asc |
| 10 | Create | POST from list with **`title`** + **`site_id`** required; open detail for lines |
| 11 | Delete | Hard delete **`draft`** only; block when **`won`** and child `job` exists; `sent` / `lost` / `expired` delete rules — operator confirm + no job reference |
| 12 | Resume order | Task 19: **`estimate.md`** → **`job.md`** → minimal **`item.md`** → remaining catalog → procurement/billing ([decision](../decisions/estimate.md#decision-estimate-wave-4--implementation-order-2026-06-23)) |

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
| Shipped vs target | **New** (dev spike at `/estimates/demo` only) |

### `estimate_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `estimate_detail` |
| Pair | detail pane for `estimate_list` |
| Route | `/estimates/[id]` — `id` = `estimate.id` |
| API | `GET` / `PATCH` / `POST` / `DELETE /api/estimates/[id]` |
| Anchor table | `estimate` |
| All tables (DAL) | `estimate`, `estimate_line`, `estimate_party`, `estimate_section` (read/write when `quote_sections` ships); joins `site`, `site_location`, `job_party_relation`, `party`, catalog tables for labels |
| Shipped vs target | **New** |

**Dev spike route:** `/estimates/demo` remains fixture-only until production DAL ships; remove or 404 when real `[id]` is live.

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
| `profile` | scalar | read + write | `title`, `site_id`, `status`, `estimate_date`, `valid_until`, `source_estimate_id`, `category_id` | `status` read-only except via `win`/`lose` actions |
| `stakeholders` | collection | read + write | `estimate_party` | `party_id`, `relation_id`, `sort_order` |
| `quote_sections` | collection | read + write | `estimate_section` | **Omit Field in wave 4 v1** — defer per locked answer #5 |
| `line_items` | collection | read + write | `estimate_line` | See below |

**Omit in wave 4 v1:** `quote_sections`, `notes`, `attachments`.

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

Writable PATCH keys: manifest-narrowed subset of above; **`status`** not writable via PATCH body (actions only).

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
  "estimate_section_id": null,
  "site_location_id": null,
  "phase_id": null,
  "item_id": null,
  "part_id": null,
  "vendor_part_id": null,
  "parent_line_id": null
}
```

**Replace-array** on Save with `profile` and `stakeholders`. Client sends full ordered array; DAL assigns `line_number` / `sort_order` from array order.

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

**Field grants:** wave 4 v1 — single `write` covers `profile`, `stakeholders`, `line_items`. Per-Field split deferred.

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
- **`line_items`** — all rows for estimate ordered by `sort_order`; join optional labels (`site_location.label`, `phase.name`, `item.name`, `manufacturer_part.mpn`) when ids set and caller has catalog read grants.
- **Grouped UI helpers (optional read enrichment):** include site's `site_section` / `site_location` registry for quote's `site_id` when geography exists — not separate Fields; client builds parent rows.

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`title`, `site_id`), optional `stakeholders`, optional `line_items` | Insert `estimate` status `draft`; validate `site_id` exists |
| `patch` | manifest-narrowed `profile`, `stakeholders`, `line_items` | Scalar profile keys; collections replace-array |
| `delete` | — | Hard delete when allowed; pre-check job reference when `won` |
| `win` | — | Set `status = won`; create `job` + copy parties/lines (job DAL — when #21 ships) |
| `lose` | — | Set `status = lost` |

**`line_items` validation (minimum):**

| Rule | Enforce |
|------|---------|
| `line_kind` | `product` \| `labor` \| `expense` |
| `line_role` | `standalone` \| `kit_header` \| `kit_component` |
| Kit integrity | Every `kit_component.parent_line_id` references a header in the same payload |
| `site_location_id` | Must belong to `estimate.site_id` when set |
| `phase_id` | Labor lines only when phase catalog exists |
| Snapshot | Persist `description`, `quantity`, `unit`, `unit_cost`, `unit_price` as sent — catalog ids optional |

**Proposed locations:** when grouped editor creates new `site_location` on quote site, DAL inserts `site_location` with `status = proposed` on PATCH (wave 2b+ / grouped mode). Flat v1 may leave `site_location_id` null.

**Delete blockers:**

| Condition | Error |
|-----------|-------|
| `status = won` and `job` references estimate | `ConflictError` `{ type: 'job' }` |
| Referenced `site_location` tombstone rules | Per [`site-geography.md`](./site-geography.md) — estimate PATCH does not hard-delete locations |

**Transactions:** each mutation single transaction; audit on success.

---

## F — Domain rules

- **Site anchor** — every estimate has `site_id`; physical place on lines is `site_location_id` on that site only ([geography decision](../decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17)).
- **General bucket** — `site_location_id = null` for quote-wide or unassigned lines.
- **Commercial vs site geography** — `estimate_section` / `quote_sections` ≠ `site_section`; do not mix in UI labels.
- **Snapshots** — line commercial fields are frozen on save; catalog price changes do not rewrite saved quotes ([general decision](../decisions/general.md#decision-line-item-snapshots-on-estimate--job--invoice-2026-06-12)).
- **Win → job** — copy `site_id`, `estimate_party` → `job_party`, `estimate_line` → `job_line` including `site_location_id`; promote `proposed` locations on job complete ([site lifecycle](../decisions/site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17)).
- **Site delete** — blocked when estimate references site ([`site.md`](./site.md) § E).
- **Audit:** all mutations on registered tables.

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
│ ── Line items ──                                             │
│ [ Flat | Grouped by place ]   ← grouped hidden until wave 2b │
│ antd Table size="small" — line_items                         │
│ Add line | Add item | Add kit                                │
│ ── footer ── total ext sell                                  │
└──────────────────────────────────────────────────────────────┘
```

**Shared component:** `EstimateDetailForm` (production); spike reference `EstimateLineEditorSpike`.

### `line_items` table — flat mode (wave 4 v1)

| Column | Line rows | Notes |
|--------|-----------|-------|
| Kind | `Select` | product / labor / expense |
| Description | `Input` | indent when `kit_component` |
| Item / part / phase | `Select` or text | kind-dependent; static until catalog |
| Qty | `InputNumber` | |
| Unit | `Input` | |
| Cost | `InputNumber` | `unit_cost` |
| Sell | `InputNumber` | `unit_price` |
| Ext sell | read-only | qty × sell |
| Actions | delete | cascade kit header |

Optional **Location** column when site has locations (wave 2b+); omit in minimal flat v1.

### `line_items` table — grouped mode (after wave 2b)

Single `Table`, flattened `dataSource`:

1. **General** parent — lines with null `site_location_id`
2. **Section** parents — from site registry (no line FK)
3. **Location** parents — under section or top-level when no section
4. **Line** rows — full editors; same columns as flat

Parent rows: custom `render` + **`colSpan`** — label, expand/collapse, “Add line here”; **no** qty/cost/sell cells ([decision](../decisions/estimate.md#decision-estimate-line-editor--expand-on-add-and-grouped-table-ui-2026-06-23)).

**Add behavior:**

| Control | Result |
|---------|--------|
| Add line | Empty standalone row at context location |
| Add item | Seed from catalog; assembly expands to component lines |
| Add kit | Header + default components at context location |

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
| `stakeholders` | Add stakeholder | Any `party`; relation from `job_party_relation_table` | "No stakeholders" |
| `line_items` | Add line / item / kit | Item catalog when `item_list` ships; else description-only | "No lines" |

**Stakeholders:** replace-array on Save; duplicate `(party_id, relation_id)` inline error.

**Empty relation catalog:** disable add; CTA → progressive setup or job party relation catalog (spec #19).

**Kit delete:** removing header removes components client-side before Save; DAL rejects orphan `kit_component` rows.

**Drag reorder:** defer to production pass ([spike fork](../spikes/estimate-line-editor.md)); use `sort_order` from array order on Save v1.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create | POST | `draft`; `title` + `site_id` required |
| Edit lines | PATCH | replace-array `line_items` |
| Send (manual) | PATCH `status` → `sent` | **Optional v1** — operator may use status field in profile read-only display updated by action later |
| Win | `win` action | `won` + job create when job slice ready |
| Lose | `lose` action | `lost` |
| Expire | batch or manual | `expired` — defer automation v1 |
| Delete | DELETE | `draft` when no blocking job |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Site with no geography** | Grouped toggle disabled; all lines in flat grid; `site_location_id` null |
| **Line without catalog ids** | Valid — description + qty + cost + sell suffice |
| **Assembly expand** | One PATCH may grow line count; client generates temp client keys for new rows until save |
| **Kit header sell rollup** | Header may show sell; components may have own costs — ext sell sums all lines unless UI hides components from rollup (defer print rules) |
| **Won estimate edit** | **Block** `line_items` PATCH when `won` — v1 immutable; revisions via `source_estimate_id` chain deferred |
| **`part_id` without catalog read** | Store id; omit label in DTO |
| **Codegen** | Hand-written descriptor + line table until codegen ships |
| **Demo route** | Retire `/estimates/demo` when production `[id]` accepts real UUIDs |

---

## Implementation waves (from planning session)

| Wave | Deliverable |
|------|-------------|
| **4a** | Estimate DDL migration; YAML; DAL read/write; `/estimates` list+detail; **flat** `line_items` Table; stakeholders; Save/Revert |
| **4b** | `win` / `lose`; job copy on win (requires job slice) |
| **2b** (parallel or before 4 grouped) | Site `sections` / `locations` UI — prerequisite for live grouped toggle |
| **4c** | Grouped-by-place Table (General / Section / Location parents); `proposed` location create on add |
| **3 + 4d** | Catalog pickers (`item`, `part`, `phase`); assembly expand from real `item_part_link` |
| **Later** | `quote_sections`; drag reorder; revision chain UI |

---

## Verify (stop gate)

- [x] Locked answers #1–12 (2026-06-23) reflected in decisions + spike
- [x] A–K complete
- [x] Planning session — [task 20](../tasks/20-ui-discovery.md) step 4 (2026-06-23)
- [x] Implementation task — [task 22](../tasks/22-estimate-wave-4a.md) (2026-06-23)
- [x] DDL migration for estimate tables — [task 22 step 1](../tasks/22-estimate-wave-4a.md#step-1--estimate-ddl-migration) (2026-06-23)
- [x] YAML + `codegen:check` for `estimate_list` / `estimate_detail`
- [x] DAL read/write + API routes
- [x] Production UI — flat `line_items` replaces dev-only `/estimates/demo`
- [ ] Grouped toggle (after wave 2b geography)
- [ ] `win` → job copy (with job slice)
