# Procurement and purchase orders

> **Status:** Planning (2026-06-27). Extends [`decisions/procurement.md`](../decisions/procurement.md).

### Decision: procurement — lead time on vendor_part, ad-hoc PO lines (2026-06-27)

**Choice:**

- **`lead_time_days` on `vendor_part`** (locked P1) — per vendor SKU, not only on manufacturer part.
- **Ad-hoc parts on PO allowed** (locked P3) — PO lines without requisition/BOM link; `part_id` + description on draft PO.
- **Install target** for readiness math — see [07-open-decisions.md](./07-open-decisions.md#P2).

---

## Chain (unchanged intent)

```
job_line_part (material requirement / engineering BOM)
    → requested_order_line
    → purchase_order_line
    → material_receipt_line
    → job_material_movement (job-site ledger)
```

| Layer | Purpose |
|-------|---------|
| **Demand** | `job_line_part` on scope item |
| **Requisition** | Intent — ordered or withdrawn |
| **PO** | Vendor commitment |
| **Receipt** | Physical arrival on job |

Job-site inventory only v1 — not org WMS.

---

## Material requirement

| Field | Notes |
|-------|-------|
| `job_scope_item_id` | Parent sold line |
| `part_id`, `vendor_part_id` | Exact buy |
| `quantity`, `unit` | |
| `site_area_id` | Where needed |
| `material_status` | From estimate/job |

---

## PO readiness (install minus lead time)

**Goal:** Surface parts in a **Ready to order** pool when install is approaching.

```
order_by_date = install_target − vendor_part.lead_time_days
```

| Term | Meaning |
|------|---------|
| **`install_target`** | Date install phase is expected to need the part — source **open** (P2): manual on `scope_phase.target_date`, job start + offset, or manual only v1 |
| **`lead_time_days`** | On **`vendor_part`** — vendor-specific |

When `order_by_date <= today` and material is verified (or policy allows assumed), line appears in ready pool → user adds to requisition/PO.

**P3:** Unverified/ad-hoc parts may still be PO'd — no hard block v1.

---

## Requisition lifecycle (existing)

Line status: `open` | `on_purchase_order` | `fulfilled` | `withdrawn`.

Every open line ends **ordered** (PO path) or **withdrawn** with note.

---

## Related

- [03-jobs-progress.md](./03-jobs-progress.md) — scope phases, `target_date`
- [02-estimates.md](./02-estimates.md) — material_status
- [05-billing.md](./05-billing.md) — `qty_received` billing basis (deferred auto)
