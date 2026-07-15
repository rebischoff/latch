# SubHub decisions — costing

> Job budget, committed cost, actual cost, margin, and re-budget — distinct from customer-facing change orders.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: job costing — budget / committed / actual / margin layers (2026-07-14)

**Status:** **Locked** (task [45](../tasks/45-job-costing-and-change-order-reconciliation.md)). **Planning:** [`planning/15-job-costing-and-change-orders.md`](../planning/15-job-costing-and-change-orders.md).

**Choice:**

| Layer | Source | Storage |
|-------|--------|---------|
| **Contract** | `Σ job_line.unit_price × quantity` (`status = active`) | Derived — no new table |
| **Budget** | `Σ job_line.unit_cost × quantity` (`status = active`) | Derived — no new table |
| **Re-budgeted** | Latest `job_line_cost_revision.new_unit_cost` per line; else falls back to budget | New table — see re-budget decision below |
| **Committed** | `Σ purchase_order_line.unit_cost × quantity` for lines not yet fully received, joined via `job_line_part_id` → `job_line_id` | Derived rollup — no new table |
| **Actual (material)** | `Σ material_receipt_line.unit_cost × quantity` | Derived rollup — needs `unit_cost` added to `material_receipt_line` (currently missing) |
| **Actual (labor)** | — | **Out of v1** — no timesheet/labor-hours entity; `scope_phase` stays qty-of-phase, never hours or $ |
| **Margin** | Contract − chosen cost layer (Budget \| Re-budgeted \| Actual), reported side by side | Derived — never stored |

**Rationale:** Every $ figure a job needs already exists as a column somewhere in the sold-line snapshot or procurement chain, except **material actual cost** — the one real gap. Everything else is a DAL rollup; computing three more numbers at read time is cheaper and safer than a parallel cost ledger that can drift from `job_line` / `purchase_order_line`. Labor $ actuals require a genuinely new subsystem (crew time entry) not justified by "we should see job costing" alone — defer until a labor-cost-specific need appears.

**Not in v1:** Labor hours/$ actuals; WIP / percent-complete revenue recognition; cost-code / GL mapping; forecast-to-complete beyond `Budget − Actual = Remaining`.

---

### Decision: `material_receipt_line.unit_cost` — material actual cost (2026-07-14)

**Status:** **Locked** (task [45](../tasks/45-job-costing-and-change-order-reconciliation.md)).

**Choice:** Add `unit_cost numeric NOT NULL DEFAULT 0` to `material_receipt_line`. Snapshot at receive time from, in priority order: linked `purchase_order_line.unit_cost` → `job_line_part.unit_cost` → `manufacturer_part` last-known vendor cost → `0` with a UI prompt to confirm. Ad-hoc / stock / customer-supplied receipts (`source_kind != 'purchase_order'`) require manual entry — no PO to snapshot from.

**Rationale:** Without a cost on the receipt line, "what did the material we actually used cost" cannot be answered — only "what we committed to pay" (PO) or "what we planned to pay" (BOM). This is the one net-new cost column the whole costing model needs.

**DBML / migration:** Landed in task 45 — migration **075** (`job_line_cost_revision`; conditional `material_receipt_line.unit_cost` when the receipt table exists). Rest of the receipt chain (`material_receipt`, `job_material_movement`) unchanged — see [procurement.md](./procurement.md).

---

### Decision: re-budget — `job_line_cost_revision`, distinct from change order (2026-07-14)

**Status:** **Locked** (task [45](../tasks/45-job-costing-and-change-order-reconciliation.md)). **Planning:** [`planning/15-job-costing-and-change-orders.md`](../planning/15-job-costing-and-change-orders.md).

**Choice:** New table `job_line_cost_revision` (`job_line_id`, `previous_unit_cost`, `new_unit_cost`, `reason`, `revised_by`, `revised_at`). PM/estimator revises the **anticipated cost** of a sold line — material got more expensive, a labor estimate was wrong, a vendor quote came in different — **without** touching `unit_price` or generating a change order. `job_line.unit_cost` updates to the new value in the same transaction (current cost basis for budget rollups); the revision row is the audit trail with a required `reason`.

| | Change order | Re-budget |
|---|---|---|
| Changes | Contract scope + `unit_price` (customer-facing) | `unit_cost` only (internal) |
| Table | `change_order` / `change_order_line` | `job_line_cost_revision` |
| Visible to customer | Yes (signed CO) | No |
| Triggers | Scope addition / deduction / revision | Cost discovery, vendor price change, estimate error |
| Effect on margin | Changes both budget and contract $ | Erodes (or improves) margin only |

**Rejected — reuse `change_order` with a `$0` price delta:** conflates an internal PM note with a customer-signed document and forces every cost correction through CO approval/immutability machinery meant for contract changes.

**Rejected — direct `PATCH job_line.unit_cost` with only `latch_audit` history:** audit rows are an opaque before/after blob, not a queryable "original estimate cost → re-budgeted cost → actual cost" report; a first-class row lets the DAL and UI show that trend without parsing audit JSON.

**Rationale:** PMs need to say "this is going to cost more than we sold it for" without it looking like a customer change, and without silently overwriting the number the estimate was built on.

---

## Related

- [`planning/15-job-costing-and-change-orders.md`](../planning/15-job-costing-and-change-orders.md)
- [`job.md`](./job.md) — change orders, `job_line` ledger, CO ↔ BOM ↔ scope phase reconciliation
- [`procurement.md`](./procurement.md) — `job_line_part`, `purchase_order_line`, `material_receipt_line`
- [`billing.md`](./billing.md) — `job_line.unit_price` as the billing/margin ceiling
