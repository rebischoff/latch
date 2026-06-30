# SubHub decisions — billing

> Billable staging, invoices, SOV, retainage, and progress billing.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: billing — scope phase rollups and SOV to scope groups (2026-06-27)

**Status:** **Planning** — [`planning/05-billing.md`](../planning/05-billing.md). **Amends** [billing (2026-06-17)](#decision-billing--earned-staging-progress-sov-retainage-2026-06-17) when progress model ships.

**Choice:**

- **`billable_line`** = earned staging (no separate billing_application table).
- Extend **`sov_allocation`** with `job_scope_group_id`, `scope_phase_id`.
- **`qty_installed`** generator reads **`scope_phase`** rollups when implemented — **not v1** (B4 locked: manual staging first).

**Rationale:** Billing stays three-layer; production progress drives earn % via scope phases when auto generator ships.


### Decision: auto billable — manual staging v1 (B4 locked 2026-06-27)

**Choice:** First billing wave (6b) — PM creates/edits `billable_line` manually. No auto generator from `scope_phase` / progress rollups in v1.

**Rationale:** Ship billing UI without coupling to field progress automation; generator deferred.


### Decision: billing — earned staging, progress, SOV, retainage (2026-06-17)

**Choice:** Three-layer **customer billing** (parallel to procurement's requisition → PO):

| Layer | Tables | Purpose |
|-------|--------|---------|
| **Scope** | `job_line` (+ `change_order`) | Sold contract — source of unit_price and qty cap |
| **Earned / billable** | `billable_line` | Staging — what *may* be invoiced; manual or auto-generated |
| **Invoiced** | `invoice`, `invoice_line` | Customer document — snapshot amounts at issue |

**Billing models (`job.billing_model`):**

| Value | Typical use |
|-------|-------------|
| `lump_sum` | One invoice at job complete |
| `progress_line` | Deposit + periodic progress from sold lines (default) |
| `progress_sov` | Predetermined SOV milestones |
| `tm` | Time-and-materials / line billing as work completes |

**Auto billable generators (`job.billing_basis`, overridable per `billable_line`):**

| Basis | Source | v1 |
|-------|--------|-----|
| `qty_installed` | `job_work_item` rollups vs `job_line.quantity` — **all-or-nothing per phase** on each work item | **ship** |
| `qty_received` | `material_receipt_line` → `job_line_part` → `job_line` | deferred |
| `sov_scheduled` | `sov_line` + `sov_allocation` remaining balance | manual cap v1; auto v2 |
| `manual` | User-entered staging row | **ship** |

Field threshold: `job.bill_on_work_status` (`installed` \| `verified`) — when work items qualify for auto billable.

**Field completion (locked 2026-06-17):** No `percent_complete` on `job_line`. Completion is tracked on **`job_work_item`** — sold line (+ optional eng part) × `site_location` × `phase`, **all-or-nothing** per phase (e.g. toilet installed or not; pull station tested or not). Billing rollups count work items that meet `bill_on_work_status`, not fractional line %.

**Invoice kinds (`invoice.billing_kind`):** `standard` \| `deposit` \| `progress` \| `retention_release` \| `final`. Header snapshots at issue: `gross_subtotal`, `retainage_withheld`, `deposit_applied`, `net_due`. Optional `period_start` / `period_end` for monthly progress windows.

**Retainage:** `job.retainage_pct` (and optional `schedule_of_value.retainage_pct` override). Withheld on progress invoices; `retention_release` / `final` invoices release pool. Deposits: `sov_line.line_kind = deposit` or `billing_kind = deposit` invoice; apply via `deposit_applied` on later progress invoices.

**SOV allocation:** `sov_allocation` — exactly one of `allocation_pct` or `allocated_value` per row (CHECK in migration).

**SOV sync:** `schedule_of_value` + `sov_line` (`line_kind`: `base` \| `change_order` \| `deposit` \| `retention`) + **`sov_allocation`** junction to `job_line` and/or `phase_id`. SOV caps milestone billing; invoice lines still snapshot detail and trace via `job_line_id` / `sov_line_id`.

**Document numbers:** partial unique indexes on `purchase_order.po_number` and `invoice.invoice_number` when not null.

**DAL rules (locked intent):**

- `SUM(invoice_line.quantity WHERE job_line_id = X) ≤ job_line.quantity` for active lines.
- Pickup: selected `open` `billable_line` → insert `invoice_line` with **`billable_line_id`** (canonical FK); set `billable_line.invoice_line_id` + status `on_invoice` in same transaction.
- Void invoice → linked `billable_line` revert to `open`.
- `job_work_item` feeds reports and billable generation — **does not** replace invoice amounts.

**Surfaces (Slice 6b):** `invoice_list` / `invoice_detail`; `billable_items` and `sov_milestones` on **`job_detail`** Billing tab — see [SOV UI placement](#decision-sov-ui--nested-on-job_detail-billing-tab-2026-06-17).

**Deferred:** payment ledger / partial pay, `billing_period` close table, receipt-driven auto generator, full AIA G702/G703, SOV auto-sync from estimate sections.

**DBML:** `TableGroup billing` — `billable_line`, `invoice`, `invoice_line`, `schedule_of_value`, `sov_line`, `sov_allocation`.


### Decision: SOV UI — nested on `job_detail` Billing tab (2026-06-17)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O5).

**Choice:** Schedule of Values edited only via **`sov_milestones`** collection Field on **`job_detail`** (Billing tab). **No** `schedule_of_value_list` / `schedule_of_value_detail` Surface in v1.

| Aspect | Rule |
|--------|------|
| **Where** | Billing tab alongside `billable_items` |
| **When visible** | `billing_model = progress_sov` |
| **Tables** | `schedule_of_value` (1:1 per job in v1), `sov_line`, `sov_allocation` |
| **Nav** | No standalone SOV routes — edit from the job |
| **Policy** | Same `job_detail` Surface — tabs are UI only ([job layout decision](./job.md#decision-job_detail-layout--tabbed-2026-06-17)) |

**Rationale:** SOV is job-scoped; v1 DBML allows one SOV per job. Nesting avoids an extra Surface, route, and manifest for data that never stands alone. Revisit a standalone editor only if milestone/allocation UX outgrows the tab.
