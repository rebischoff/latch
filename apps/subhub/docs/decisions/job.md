# SubHub decisions — job

> Jobs, field status, change orders, engagements, and `job_detail` layout.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

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

**Save:** One form submit per tab visit or whole-job save — implementation picks one pattern; manifest gates Fields per tab regardless.

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
