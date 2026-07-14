# Jobs — `job_list` · `job_detail`

> **Wave:** 5 · **Status:** target spec (2026-06-23) · **Implementation:** [`23-job-wave-5a.md`](../tasks/23-job-wave-5a.md) wave 5a — **complete** (2026-06-24) · **Prerequisite:** [`site.md`](./site.md) wave 1 shipped; Scope line UI requires wave **3** (`part` + minimal `item`) + shared line editor (**3e**) — [`estimate.md`](./estimate.md) wave **4d′** · **Catalog:** [`surfaces.md`](../surfaces.md#job_list--job_detail) · **DBML:** `job`, `job_party`, `job_line`, `job_line_part`, `job_work_item`, `job_party_relation` · **Decisions:** [wave 5 order](../decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23), [tabbed layout](../decisions/job.md#decision-job_detail-layout--tabbed-2026-06-17), [engagements `job_kind`](../decisions/job.md#decision-engagements--job_kind-2026-06-17), [field status](../decisions/job.md#decision-field-status--job_work_item-2026-06-17), [change orders ledger](../decisions/job.md#decision-change-orders--unified-job_line-ledger-2026-06-17), [line grouping](../decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17)

**Related:** Site anchor via `profile.site_id` → [`site_detail`](./site.md). Stakeholder catalog: [`job-party-relation.md`](./job-party-relation.md) (parallel to [`site-contact-relation.md`](./site-contact-relation.md); page at `/party-relations`). Win → job copy in wave **5b** → [`estimate.md`](./estimate.md). Billing Fields → [`job-billing-fields.md`](./job-billing-fields.md) (#27).

---

## Locked product answers (2026-06-23)

| # | Topic | Choice |
|---|--------|--------|
| 1 | **5a scope** | List + **Overview** (`profile` + `stakeholders`) live; **Scope / Field / Billing tabs stubbed** |
| 2 | **`billing_settings`** | **Omit in 5a** — DB column defaults only; Field ships on Overview in wave **6b** / spec #27 |
| 3 | **List** | Columns **`title`**, **site name** only — defer `status`, `job_kind`, search, sort UI, filters |
| 4 | **List DAL order** | Fixed **`title` asc** (stable pagination; no sort UI) |
| 5 | **Create** | POST **`title` + `site_id`**; defaults `job_kind = project`, `status = planned` |
| 6 | **`profile` PATCH** | `title`, `site_id`, `status`, `job_kind` — block entire PATCH when `status = cancelled` |
| 7 | **`site_id` change** | Allowed only when `estimate_id` is null **and** no `job_line` rows |
| 8 | **`estimate_id`** | Read-only; link to estimate when grant |
| 9 | **`parent_job_id`** | **Defer** 5a |
| 10 | **Stakeholders** | Replace-array; add `sort_order` on `job_party`; standard catalog pickers + progressive-setup suggested relation names in empty state |
| 11 | **`line_items`** | **Not in 5a YAML**; DAL read/write implemented for **5b** win-copy; no Scope grid until **4d′** |
| 12 | **Delete** | **Defer 5a** — no `delete` action or DELETE route |
| 13 | **Status (5a)** | `planned` \| `active` \| `cancelled` — writable `Select`; any transition until cancelled (then read-only) |
| 14 | **`complete`** | Declared in 5a policy; **no toolbar handler** until **5c** (`status = complete` + geography publish) |
| 15 | **Save** | **Whole-job** — one Save/Revert toolbar; PATCH `profile` + `stakeholders` only in 5a |
| 16 | **Tab stubs** | Scope / Field / Billing visible with empty-state copy + estimate link on Scope when `estimate_id` set |
| 17 | **Toolbar (5a)** | New (list), Save, Revert only |
| 18 | **Cross-nav** | Site + estimate links on detail; defer `?site_id=` list filter and hub `related_engagements` |
| 19 | **Dev seed** | **None** — use `/party-relations` catalog page |
| 20 | **Line editor (later)** | **Flat** persisted shape; grouped-by-place after wave **2b** — same as estimate |

---

## A — Identity

### `job_list`

| Key | Value |
|-----|-------|
| `surface_id` | `job_list` |
| Pair | list pane for `job_detail` |
| Route | `/jobs` — `jobs/(master-detail)/layout.tsx` |
| API | `GET /api/jobs` · `POST /api/jobs` (create) |
| Nav group | Operations |
| Anchor table | `job` |
| All tables (DAL) | `job`; join `site` for site name |
| Shipped vs target | **New** |

### `job_detail`

| Key | Value |
|-----|-------|
| `surface_id` | `job_detail` |
| Pair | detail pane for `job_list` |
| Route | `/jobs/[id]` — `id` = `job.id` |
| API | `GET` / `PATCH` / `POST /api/jobs/[id]` — **no DELETE in 5a** |
| Anchor table | `job` |
| All tables (DAL) | `job`, `job_party`, `job_line`, `job_line_part` (nested in line DAL), `job_work_item` (5c+); joins `site`, `estimate`, `job_party_relation`, `party`, catalog tables for labels |
| Shipped vs target | **New** |

---

## B — Fields

### `job_list`

| Field id | Type | Writable | Columns | Notes |
|----------|------|----------|---------|-------|
| `summary` | scalar (list projection) | read | `job.id`, `title`, `site.name` | Site name as `site_display_name` in DTO |

**List columns (5a):** `title`, `site_display_name` only.

**Search / sort / filter UI:** deferred — DAL uses fixed `title` asc; optional `limit` / `offset` pagination on `GET /api/jobs`.

### `job_detail` — wave 5a

| Field id | Type | Writable | Columns / child table | Notes |
|----------|------|----------|-------------------------|-------|
| `profile` | scalar | read + write | `title`, `site_id`, `job_kind`, `status`, `estimate_id` | `estimate_id` read-only; see PATCH rules |
| `stakeholders` | collection | read + write | `job_party` | `party_id`, `relation_id`, `sort_order` |

**Omit in 5a YAML / manifest:** `line_items`, `work_items`, `billable_items`, `sov_milestones`, `billing_settings`, `notes`, `attachments`.

**Deferred Fields (later waves):**

| Field | Wave | Notes |
|-------|------|-------|
| `line_items` | **4d′** | `job_line` — Scope tab; flat then grouped-by-place |
| `work_items` | **5c** | `job_work_item` — Field tab |
| `billing_settings` | **6b** | Overview section when billing ships |
| `billable_items`, `sov_milestones` | **6b** | Billing tab — [`job-billing-fields.md`](./job-billing-fields.md) |

### Scalar — `profile` (read DTO excerpt)

```json
{
  "title": "Fire alarm — Building A TI",
  "site_id": "<uuid>",
  "site_display_name": "1200 Commerce Dr",
  "job_kind": "project",
  "status": "planned",
  "estimate_id": null,
  "estimate_display_title": null
}
```

**Writable PATCH keys (5a):** `title`, `site_id`, `status`, `job_kind` — manifest-narrowed; **`estimate_id` not writable**.

**PATCH blocked** when `status = cancelled` (`ConflictError`).

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

Unique: `(job_id, party_id, relation_id)`.

**Migration:** add `sort_order int NOT NULL DEFAULT 0` to `job_party` (parity with `estimate_party`).

### Collection — `line_items` element (DAL / 4d′ UI — not in 5a manifest)

Same commercial shape as [`estimate.md`](./estimate.md) `line_items`, plus job ledger columns:

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
  "site_location_id": null,
  "phase_id": null,
  "item_id": null,
  "part_id": null,
  "vendor_part_id": null,
  "parent_line_id": null,
  "source": "estimate",
  "status": "active",
  "estimate_line_id": "<uuid>",
  "change_order_line_id": null,
  "superseded_by_job_line_id": null
}
```

**Replace-array** on Save when Field is granted (4d′+). Operational reports sum `status = active` only ([change-order decision](../decisions/job.md#decision-change-orders--unified-job_line-ledger-2026-06-17)).

---

## C — Policy

| Surface | Action | Granted when | Re-auth |
|---------|--------|--------------|---------|
| `job_list` | `read` | grant on list | Each GET list |
| `job_detail` | `read` | grant on detail | Each GET |
| `job_detail` | `write` | grant on detail + Field | Each PATCH / POST |
| `job_detail` | `complete` | grant on detail | Each complete action — **declared in 5a YAML; no UI handler until 5c** |

**List create:** `POST /api/jobs` requires `job_detail` `write` (platform invariant — same as all list→detail Surfaces).

**No `delete` action in 5a** — added when delete ships with blockers.

**Field grants (5a):** single `write` covers `profile` + `stakeholders`. Per-Field split deferred.

**403 vs 404:** platform default.

---

## D — DAL read

### `job_list`

- **`list(ctx, { limit, offset })`** — anchor `job`; join `site` for `site_display_name`.
- **Order:** `job.title` asc (fixed).
- **No** search `q` or filter params in 5a.

### `job_detail`

- **`get(ctx, id)`** — project granted Fields only.
- **`profile`** — join `site.name` as `site_display_name`; join `estimate.title` as `estimate_display_title` when `estimate_id` set.
- **`stakeholders`** — join `party`, `job_party_relation.display_name` as `relation_label`; order by `sort_order`.
- **`line_items`** — implemented in DAL; **omitted from GET response** when Field not in readable manifest (5a).

---

## E — DAL write

| Operation | Body keys | Semantics |
|-----------|-----------|-----------|
| `create` | `profile` (`title`, `site_id`) | Insert `job` with `job_kind = project`, `status = planned`; validate `site_id` exists |
| `patch` | manifest-narrowed `profile`, `stakeholders` | Reject when `status = cancelled`; scalar profile keys; stakeholders replace-array |
| `delete` | — | **Not exposed in 5a** |
| `complete` | — | **5c** — `status = complete`; publish site geography ([`site-geography.md`](./site-geography.md)) |

**`profile` validation (5a):**

| Rule | Enforce |
|------|---------|
| `status` | `planned` \| `active` \| `cancelled` |
| `job_kind` | `project` \| `service` \| `warranty` |
| `site_id` change | Reject when `estimate_id` set or any `job_line` rows exist |
| `cancelled` | Reject entire PATCH |

**`stakeholders` validation:**

| Rule | Enforce |
|------|---------|
| Unique tuple | `(job_id, party_id, relation_id)` |
| `relation_id` | Must exist in `job_party_relation` |
| `sort_order` | From array order on replace-array |

**`line_items` (internal / 4d′):**

| Rule | Enforce |
|------|---------|
| Client PATCH (5a) | Reject `line_items` key — not in writable manifest |
| Win-copy (5b) | Internal DAL replaces lines from `estimate_line` snapshots |
| `site_location_id` | Must belong to `job.site_id` when set |
| Kit integrity | Same as estimate |
| Void / supersede | Per change-order approve path — **5d** |

**Transactions:** each mutation single transaction; audit on success.

---

## F — Domain rules

- **Site anchor** — every job has `site_id`; lines FK `site_location_id` on that site only ([geography decision](../decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17)).
- **Engagements** — one `job` table; `job_kind` distinguishes project / service / warranty; `parent_job_id` deferred in 5a UI ([engagements decision](../decisions/job.md#decision-engagements--job_kind-2026-06-17)).
- **Stakeholders** — graph on `job_party`; no sole `customer_id` on `job` ([anchor decision](../decisions/job.md#decision-job-anchor-and-stakeholders--deferred-to-job-slice-2026-06-15)).
- **Snapshots** — sold line commercial fields frozen on save ([general decision](../decisions/general.md#decision-line-item-snapshots-on-estimate--job--invoice-2026-06-12)).
- **Win → job (5b)** — copy `site_id`, `estimate_party` → `job_party`, `estimate_line` → `job_line` including `site_location_id`; set `job.estimate_id`; estimate `status = won`.
- **Complete (5c)** — promote `proposed` site locations; apply relocations/removals; do not rewrite closed job line FKs ([site lifecycle](../decisions/site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17)).
- **Cancelled** — terminal for edits in 5a (no PATCH).
- **Site delete** — blocked when job references site ([`site.md`](./site.md) § E).
- **Catalog-first Scope** — do not ship description-only job line grid; wait for shared line editor ([wave 5 decision](../decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23)).
- **Audit:** all mutations on registered tables.

---

## G — UI layout

### List + detail

Master-detail: list in `jobs/(master-detail)/layout.tsx`, detail in `[id]/page.tsx` ([`routing-and-libraries.md`](../routing-and-libraries.md)).

### Tabbed `job_detail` (O4)

One Surface; Ant Design `Tabs` — policy unchanged across tabs ([layout decision](../decisions/job.md#decision-job_detail-layout--tabbed-2026-06-17)).

```text
┌──────────────────────────────────────────────────────────────┐
│ SurfaceToolbar — New | Save | Revert                           │
├──────────────────────────────────────────────────────────────┤
│ [ Overview | Scope | Field | Billing ]                       │
│ ── Overview (5a) ──                                          │
│ profile — title, site picker, job_kind, status, estimate link│
│ stakeholders (field-array table — reuse estimate pattern)      │
│ ── Scope (stub 5a) ──                                        │
│ Empty state + link to source estimate when estimate_id set   │
│ ── Field (stub 5a) ──                                        │
│ "Field status ships in wave 5c"                              │
│ ── Billing (stub 5a) ──                                      │
│ "Billing ships in wave 6b"                                   │
└──────────────────────────────────────────────────────────────┘
```

URL `?tab=` keys: `overview` (default, omit), `scope`, `field`, `billing`. Same-surface list navigation preserves `tab` via `buildDetailHref`; invalid keys fall back to Overview.

**Shared components:** `JobDetailForm` (production); `JobStakeholderFields` (mirror `EstimateStakeholderFields`).

**Scope tab (4d′+):** shared line editor component (wave **3e**); flat default; grouped-by-place toggle after wave **2b** geography — same rules as [`estimate.md`](./estimate.md) § G.

**Billing tab (6b+):** `billing_settings` section may move to Overview per [`job-billing-fields.md`](./job-billing-fields.md); SOV when `billing_model = progress_sov` ([billing decision](../decisions/billing.md#decision-sov-ui--nested-on-job_detail-billing-tab-2026-06-17)).

---

## H — UI chrome

| Priority | Action | Handler | When enabled |
|----------|--------|---------|--------------|
| 1 | Save | PATCH `job_detail` | dirty + `write`; disabled when `status = cancelled` |
| 2 | Revert | reset form | dirty |
| 3 | New (list) | POST create | list context + `write` |

**Not in 5a toolbar:** Delete, Complete, procurement shortcuts.

### Linked Surfaces (navigation only v1)

| From | To | When |
|------|-----|------|
| `job_list` | `/jobs/[id]` | row click |
| `job_detail` | `/sites/[id]` | `site_id` set + `site_detail` `read` |
| `job_detail` | `/estimates/[id]` | `estimate_id` set + `estimate_detail` `read` |
| `job_detail` Scope stub | `/estimates/[id]` | same — "View source estimate" |
| `site_detail` | `/jobs?site_id=` | **Deferred** |
| Hub `customer_detail` / `property_owner_detail` | `/jobs/[id]` | **Deferred** — `related_engagements` |

---

## I — Collections UX

| Field | Add | Pickers | Empty state |
|-------|-----|---------|-------------|
| `stakeholders` | Add stakeholder | Any `party`; relation from full `job_party_relation_table` list (sorted `sort_order` → `display_name`) | Catalog empty: block add; list **suggested default relation names** (Customer, Property owner, Bill to, Sold to, General contractor, Subcontractor, Subcontract through) + CTA → `/party-relations` |
| `line_items` | — (5a) | — | Scope tab stub |

**Stakeholders:** replace-array on Save; duplicate `(party_id, relation_id)` inline error before Save; `orderable` table → `sort_order` from array order.

**Party picker:** retain labels for rows already selected (standard collection pattern — same as `EstimateStakeholderFields` / `SiteContactFields`).

**Kit delete / line editor:** defer to 4d′ — same shared component as estimate.

---

## J — Lifecycle

| Event | Transition | Notes |
|-------|------------|-------|
| Create | POST | `title` + `site_id`; `planned` + `project` |
| Edit | PATCH | `profile` + `stakeholders` when not `cancelled` |
| Activate / cancel | PATCH `status` | Any transition among `planned` \| `active` \| `cancelled` until cancelled |
| Cancelled | — | **Read-only** — PATCH rejected |
| Win (estimate) | **5b** | Estimate `win` → create job + copy parties/lines |
| Complete | **5c** | `complete` action → `status = complete` + geography publish |
| Delete | **TBD** | Not in 5a |

---

## K — Edge cases

| Topic | Handling |
|-------|----------|
| **Empty job, site change** | `site_id` PATCH allowed when no `estimate_id` and no `job_line` rows |
| **Won estimate anchor** | `estimate_id` set → `site_id` frozen |
| **Lines without UI** | Win-copy may populate `job_line` before Scope tab; GET omits `line_items` until manifest grants |
| **`job_kind` on service/warranty** | Writable on PATCH in 5a; `parent_job_id` UI deferred |
| **`cancelled` job** | Detail viewable; Save disabled; PATCH → `ConflictError` |
| **Site with no geography** | Scope grouped mode disabled until wave 2b — same as estimate |
| **`job_party_relation` empty** | Progressive-setup suggested names in empty state; admin path `/party-relations` — no dev seed |
| **Codegen** | Hand-written descriptor + repository until codegen ships |
| **Delete (later)** | Blockers: active invoices, open change orders, child `parent_job_id` jobs — spec TBD when delete lands |
| **List search/sort** | Deferred — add columns `status` / `job_kind` when list UX expands |

---

## Implementation waves

| Wave | Deliverable |
|------|-------------|
| **5a** | Job DDL (`job_party.sort_order`); YAML (`profile`, `stakeholders`, `complete` action declared); DAL + API; `/jobs` master-detail; Overview live; stub tabs; DAL `line_items` internal |
| **3 + 3e** | `part` / minimal `item`; shared line editor component |
| **4d′** | Retrofit estimate Scope; **job Scope tab** + `line_items` in YAML/manifest |
| **5b** | Estimate `win` / `lose`; job copy via internal DAL |
| **5c** | Field tab (`work_items`); `complete` action + geography publish; `status = complete` |
| **5d** | Change orders |
| **6b** | Billing tab + `billing_settings` on Overview; `billable_items`, `sov_milestones` |
| **TBD** | `delete` action + blockers; list search/sort/filters; hub engagement links |

---

## Verify (stop gate)

- [x] Locked answers #1–20 (2026-06-23 planning session)
- [x] A–K complete
- [x] Planning session folded into [`decisions/job.md`](../decisions/job.md)
- [x] Implementation task — [`23-job-wave-5a.md`](../tasks/23-job-wave-5a.md)
- [x] DDL migration for job tables
- [x] YAML + `codegen:check` for `job_list` / `job_detail`
- [x] DAL read/write + API routes
- [x] Production UI — Overview + stub tabs at `/jobs`
- [ ] Scope line grid (after 4d′)
- [ ] `win` → job copy (5b)
