# Requisition Surfaces (wave 6a) — locked product plan

> **Status:** **Complete** (2026-07-16). **Decisions:** [`decisions/procurement.md`](../decisions/procurement.md) (R1–R8).  
> **Keeps (layer model):** three-layer chain + line lifecycle — [`procurement.md`](../decisions/procurement.md#decision-procurement--requisition-layer-and-job-site-inventory-2026-06-17).  
> **Companion:** [`04-procurement.md`](./04-procurement.md) (lead time / ready formula), [`surfaces.md`](../surfaces.md) wave 6a draft.  
> **Next:** [52 — Requisition Surfaces](../tasks/52-requisition-surfaces.md) (confirm Q1–Q5); then [53 — PO workbench](../tasks/53-purchase-order-workbench.md).  
> **Out of this lock:** receipt UI detail, ready-pool **UI** (R7-D), org WMS, vendor EDI, auto-send PO, shipping mirrored on req (R6 deferred).

## Why

Wave **6a** had schema + layer rules but no Surface UX locks. R1–R8 lock create entry, BOM vs ad-hoc lines, multi-header + job-wide remaining, and purchaser batch → PO per job×vendor.

---

## Locked summary (R1–R8)

| # | Topic | Choice |
|---|--------|--------|
| **R1** | Create entry | **Both** — Requisitions → New → pick job **and** Job → **Request parts** (`?jobId=`). Same detail Surface. |
| **R8** | Job chrome | **Request parts** first-class (not link-only) — locked with R1 |
| **R2** | Line source | **Both** — BOM still-needed pool **plus** freeform ad-hoc / TBD |
| **R3** | BOM qty | **Editable, cap at remaining** — default remaining; lower only |
| **R4** | Many headers | **Allowed** per job; optional `phase_id`. **Remaining / Order rollup is job-wide** across all reqs |
| **R5** | Purchaser batch | Select open lines on **PO workbench** (cross job/req); **vendor pick**; **one draft PO per job × vendor** |
| **R6** | Req → PO display | Line shows **PO number + status** (link). Shipping/ETA on req **deferred** |
| **R7** | Ready pool UI | **Defer** — P2 formula stays; no ready filter/highlight in first 6a ship |

### Layer model (unchanged)

| Layer | Tables | Purpose |
|-------|--------|---------|
| Demand | `job_line_part` | Engineered BOM |
| Requisition | `requested_order*` | Intent — ordered or withdrawn |
| PO | `purchase_order*` | Vendor commitment |
| Receipt | `material_receipt*` + ledger | Physical arrival on job |

---

## End-to-end (locked)

```text
Job BOM (job_line_part)
  → Requisition(s) — BOM pool and/or ad-hoc; many headers OK; remaining is job-wide
  → PO workbench — select open lines, pick vendors, Create POs
  → one draft PO per (job × vendor)
  → Receipt → job-site ledger
```

---

## Detail (by fork)

### R1 / R8 — Create entry ✅

- List → New → pick `job_id`.
- Job → **Request parts** → `/requisitions/new?jobId=` (job prefilled).
- Same `requested_order_detail`.

### R2 — Line source ✅

- BOM pool of `job_line_part` still needing order.
- Freeform: `part_id` and/or description (`job_line_part_id` null).

### R3 — Partial qty ✅

- Default = job-wide remaining; may lower; no over-request vs remaining.

### R4 — Many headers + job-wide remaining ✅

- Many `requested_order` per job.
- Remaining = sum req qty (all headers, exclude withdrawn) + PO/receipt coverage per `job_line_part`.

### R5 — Purchaser batch ✅

1. Select on PO workbench (not a mark-on-req status).
2. Vendor per line when multiple `vendor_part`s.
3. One draft PO per `(job_id, vendor_party_id)`.

### R6 — PO on req line ✅

- Joined PO number + status; link to PO.
- Richer ship/ETA on req later.

### R7 — Ready UI ✅

- **Defer UI.** Formula (`target_date − lead_time`) remains locked (P2); Surfaces ship without ready filter first.

---

## Related

- [decisions/procurement.md](../decisions/procurement.md)
- [04-procurement.md](./04-procurement.md)
- [surfaces.md](../surfaces.md) — wave 6a draft
- [job.md — CO ↔ BOM](../decisions/job.md#decision-change-order--bom-and-scope-phase-reconciliation-2026-07-14)
