# SubHub decisions — job

> Jobs, field status, change orders, engagements, and `job_detail` layout.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: job wave 5 — implementation order (2026-06-23)

**Status:** Locked in job planning session (2026-06-23); **amended** spec planning session (2026-06-23). **Spec:** [`job.md`](../surface-specs/job.md) ✅ · **Task:** [`23-job-wave-5a.md`](../tasks/23-job-wave-5a.md).

**Choice:** **Catalog-first (path X)** — shared line-item UI ships after wave **3** (`part` + minimal `item`); estimate 4a line grid is **interim** and will be reworked in **4d′** with the same component used on job Scope, then PO/invoice lines.

#### Locked product answers

| # | Topic | Choice |
|---|--------|--------|
| 1 | **5a scope** | List + **Overview** (profile + stakeholders) live; **Scope / Field / Billing tabs stubbed** in shell |
| 2 | **Line editor** | **Flat** persisted shape when UI ships; grouped-by-place after wave **2b** — same as estimate |
| 3 | **Create** | **Manual** POST (`title` + `site_id`) in **5a**; service/warranty jobs need a front door |
| 4 | **`win` → job** | **5b** — estimate `win`/`lose` + copy after job DAL exists; stub/hidden on estimate until then |
| 5 | **Stakeholders** | **Include in 5a** — `job_party` replace-array; reuse estimate stakeholder pattern |
| 6 | **Field tab** | **Defer** — no `work_items` in YAML; no `job_work_item` DAL in 5a |
| 7 | **Change orders** | **Defer** — separate `change_order_*` surfaces (wave **5d**) |
| 8 | **Billing tab** | **Stubbed** — no billing Fields in 5a YAML; DBML column defaults only |
| 9 | **Save** | **Whole-job** — one Save/Revert toolbar across tabs ([amended tabbed layout](#decision-job_detail-layout--tabbed-2026-06-17)) |
| 10 | **`complete`** | **Defer** — 5a status: `planned` \| `active` \| `cancelled` only; publish geography in **5c** |
| 11 | **Catalog pickers** | **Catalog-first** — no job Scope line UI until wave **3** + shared line editor; do not copy interim estimate grid as target |
| 12 | **5a exit** | CRUD jobs with profile + stakeholders; tabbed shell; DAL/API for `line_items` (win-copy ready); **no Scope line grid** |

#### Spec planning amendments (2026-06-23)

Session locked in [`job.md`](../surface-specs/job.md) — overrides or extends rows above where noted:

| Topic | Choice |
|-------|--------|
| List | `title` + site name only; defer search, sort UI, filters; DAL `title` asc |
| `billing_settings` | Omit from 5a YAML; DB defaults only; Overview section in **6b** |
| `profile` PATCH | `title`, `site_id`, `status`, **`job_kind`**; block all PATCH when `cancelled` |
| `site_id` change | Only when no `estimate_id` and no `job_line` rows |
| Delete | Defer 5a — no DELETE route |
| `complete` | Declare in policy YAML; no toolbar handler until **5c** |
| Stakeholders | Add `job_party.sort_order`; standard catalog pickers + suggested relation names in empty state |
| Dev seed | None — `/party-relations` only |
| Cross-nav | Site + estimate links; defer hub engagements and `?site_id=` filter |

#### Wave order (after planning)

| Wave | Deliverable |
|------|-------------|
| **5a** | Job migration + YAML + DAL + API + `/jobs` shell (Overview only) |
| **3** | `part_*`, minimal `item_*` — catalog foundation |
| **3e** | Shared line editor spike + component |
| **4d′** | Retrofit estimate Scope; enable job Scope; same component for PO/invoice later |
| **5b** | Estimate `win` / `lose` + job copy |
| **5c** | Field tab (`work_items`) + `complete` + site geography publish |
| **5d** | Change orders |
| **6b** | Billing tab (`billable_items`, `sov_milestones`) |

**Rationale:** Line items across estimates, jobs, POs, and invoices should anchor on real `item` / `part` pickers and assembly expand — not description-only grids. Job shell still lands early so policy, nav, stakeholders, and win-copy DAL are ready before Scope UI.


### Decision: field status — `job_work_item` (2026-06-17)

**Choice:** Replace `job_line_progress` with **`job_work_item`** — one row per trackable unit: sold line (+ optional `job_line_part`) × `site_location` × `phase`, with `status` (`pending` | `in_progress` | `installed` | `issue` | `verified` | `skipped`). **All-or-nothing per phase** — no fractional completion on `job_line`.

**Not superseded by `site_location` or audit:** `site_location` is the as-built **registry** (what exists where). `job_work_item` is **per-job execution** (installed / issue / skipped on this engagement). Geography changes on job complete update `site_location` + `latch_audit`; field status stays on `job_work_item`. Status change history → `latch_audit` on work-item mutations; defer `job_work_item_event` until a tech timeline UI needs it.

**Rationale:** Supports per-spot install reporting for billing rollups and stakeholders; percent-on-sold-line alone is insufficient.


### Decision: change orders — unified `job_line` ledger (2026-06-17)

**Choice:**

- `change_order.estimate_id` optional — CO from quote or entered directly.
- `change_order_line.line_action`: **`add`** | **`deduct`** | **`revise`**; `target_job_line_id` for deduct/revise.
- On **approve:** `add` → new `job_line` with `change_order_line_id`; `deduct` → `job_line.status = voided` + provenance; `revise` → void + replacement line (`superseded_by_job_line_id`).
- CO lines remain immutable; operational scope is always **`job_line`** (`source`: `estimate` | `change_order` | `manual`).

**Rationale:** Additive and deductive amendments with audit trail; avoid negative-qty sold lines.


### Decision: engagements — `job_kind` (2026-06-17)

**Choice:** Single **`job`** table for install projects, service calls, and warranty work.

- `job_kind` CHECK: `project` | `service` | `warranty`
- `parent_job_id` optional — warranty / follow-up to prior job
- Same child tables: lines, parts, work items, change orders, financials

**Rationale:** Service tickets share scope, geography, and field-status machinery with install jobs — no parallel ticket schema in v1.


### Decision: `job_detail` layout — tabbed (2026-06-17)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O4).

**Choice:** **One** `job_detail` Surface; **tabbed** page layout (Ant Design `Tabs`). Policy and PATCH remain a single Surface — tabs are UI organization only.

| Tab | Fields / content |
|-----|----------------|
| **Overview** | `profile`, `stakeholders`, `billing_settings` |
| **Scope** | `line_items` (+ links to `change_order_*`); procurement **links** to `requested_order_*`, `purchase_order_*`, `material_receipt_*` (separate Surfaces) |
| **Field** | `work_items` |
| **Billing** | `billable_items`, `sov_milestones` (when `billing_model = progress_sov`) — wave 6b; links to `invoice_*` |

**Save:** **Whole-job** — one Save/Revert toolbar; single PATCH for all writable Fields on the form ([wave 5 order](#decision-job-wave-5--implementation-order-2026-06-23)). Tabs are layout only; manifest gates Fields per tab regardless.

**Not in tabs:** Procurement and invoice **documents** stay separate Surfaces; job shows summary counts + deep links.

**Catalog:** [`surfaces.md`](../surfaces.md#job_list--job_detail).


### Decision: job anchor and stakeholders — deferred to job slice (2026-06-15)

**Choice:** `job` (and `job_party`, estimates, lines, `site_section` / `site_location` on site) are **out of Slice 2**. Locked contract for Slice 5:

- `job.site_id` NOT NULL → where work happens
- `job.job_kind` — `project` | `service` | `warranty`; optional `parent_job_id`
- `job_party (job_id, party_id, relation_id)` — `relation_id` FK → **`job_party_relation`** catalog ([schema-first decision](./general.md#decision-schema-first--finish-dbml-before-migrations-2026-06-16)); suggested display names include: `customer`, `property_owner`, `bill_to`, `sold_to`, `general_contractor`, `subcontractor`, `subcontract_through`
- No `customer_id` column on `site` or `job` as the sole counterparty link
- **No `job_location`** — site geography on `site_section` / `site_location` ([site-owned sections and locations](./site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17))

**Rationale:** Site slice establishes place + standing contacts; job slice adds engagement-specific stakeholder flexibility without painting Slice 2 into a single-FK corner.
