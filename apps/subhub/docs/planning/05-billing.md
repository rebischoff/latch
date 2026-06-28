# Billing

> **Status:** Planning (2026-06-27). Extends [`decisions/billing.md`](../decisions/billing.md).

### Decision: billing — scope phase rollups, SOV to scope groups (2026-06-27) — **Proposal**

**Choice:** Keep three-layer customer billing; extend allocations to job scope groups and `scope_phase`. Confirm `billable_line` = earned staging (“billing application” in planning discussions).

---

## Three layers (unchanged)

| Layer | Table | Purpose |
|-------|-------|---------|
| **Contract** | `job_line` (+ CO) | Sold qty × unit price cap |
| **Earned** | `billable_line` | What *may* be invoiced |
| **Invoiced** | `invoice`, `invoice_line` | Customer document — snapshots at issue |

**B3:** No separate `billing_application` table — **`billable_line`** is the staging entity; invoice pickup sets `invoice_line.billable_line_id`.

---

## Billing models (`job.billing_model`)

| Value | Use |
|-------|-----|
| `lump_sum` | Invoice at complete |
| `progress_line` | Progress from sold lines (default) |
| `progress_sov` | SOV milestones |
| `tm` | Time and materials |

---

## SOV (separate from scope)

```
schedule_of_value (1:1 job v1)
  → sov_line (milestone $)
      → sov_allocation
```

### SOV allocation targets (B2 — proposal)

Extend `sov_allocation` FKs:

| FK | Use |
|----|-----|
| `job_scope_group_id` | **Primary v1** — milestone maps to production block |
| `job_line_id` | Detail / line-level |
| `scope_phase_id` | Phase-weighted earn |
| `phase_id` (org catalog) | **Retire** for new jobs — use `scope_phase_id` instead |

SOV caps earned $; invoice lines still snapshot and trace scope.

---

## Field completion → billable (B1)

**Prior decision (2026-06-17):** `job_work_item` all-or-nothing; no % on `job_line`.

**Planned amendment:** Fractional completion on **`scope_phase.completed_qty`**. Billing rollups:

```
earned_qty = f(scope_phase.completed_qty, billing_weight, job.bill_on_work_status)
billable_line auto-generated when billing_basis = qty_installed
```

Cap: `SUM(invoiced qty per job_line) ≤ job_line.quantity`.

See [07-open-decisions.md](./07-open-decisions.md#B1) for migration from `job_work_item`.

---

## Auto billable generator (B4 — open)

| `billing_basis` | Source | V1 ship? |
|-----------------|--------|----------|
| `qty_installed` | Scope phase / progress rollups | **Open** — manual billable OK for first billing wave |
| `qty_received` | Material receipt | Deferred |
| `sov_scheduled` | SOV remaining | Manual cap v1 |
| `manual` | User staging row | Yes |

---

## Retainage, deposits, SOV UI

Unchanged from [`decisions/billing.md`](../decisions/billing.md):

- `job.retainage_pct`; SOV nested on **job_detail Billing tab** only.
- Invoice kinds: `deposit`, `progress`, `retention_release`, `final`.

---

## Related

- [03-jobs-progress.md](./03-jobs-progress.md) — progress, scope phases
- [02-estimates.md](./02-estimates.md) — no estimate_section; SOV may be set at job setup
