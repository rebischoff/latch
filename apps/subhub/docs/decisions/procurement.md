# SubHub decisions — procurement

> Requisitions, purchase orders, receipts, and job-site inventory.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: procurement — lead time and ad-hoc PO lines (2026-06-27)

**Status:** **Planning** — [`planning/04-procurement.md`](../planning/04-procurement.md).

**Choice:**

- **`vendor_part.lead_time_days`** — readiness: `order_by = scope_phase.target_date − lead_time` when target set (P2 locked).
- **Ad-hoc PO lines allowed** on draft PO (no requisition link).
- Existing requisition → PO → receipt chain unchanged.

**Rationale:** Order parts when install phase approaches minus vendor lead time; shop buys ad-hoc without full BOM.


### Decision: install target — manual scope_phase.target_date (P2 locked 2026-06-27)

**Choice:** Optional `scope_phase.target_date` is `install_target`. `order_by_date = target_date − vendor_part.lead_time_days`. No target → line not in ready pool; PO still manual.

**Rationale:** Readiness without scheduling engine; derived dates deferred v1.5.


### Decision: procurement — requisition layer and job-site inventory (2026-06-17)

**Choice:** Three-layer procurement before billing:

| Layer | Tables | Purpose |
|-------|--------|---------|
| **Demand** | `job_line_part` | Engineered BOM on the job |
| **Requisition** | `requested_order`, `requested_order_line` | PM or site tech requests parts (from BOM or ad-hoc) |
| **Commitment** | `purchase_order`, `purchase_order_line` | Vendor purchase order (draft → sent); links back to requisition lines |
| **Job-site stock** | `material_receipt`, `material_receipt_line`, `job_material_movement` | What landed on the job; on-hand ledger |

**Requisition (locked 2026-06-17, clarified):**

- Creates **intent** — "we need these parts on this job." Not a vendor order yet.
- Each line ends in one of two PM actions:
  1. **Ordered** — add to a `purchase_order` (pool pick from open lines). Line → `on_purchase_order`, then `fulfilled` when received qty covers the request.
  2. **Withdrawn** — won't order (`withdrawn` + `withdrawal_note`). Scope dropped, using alternate supply, etc.
- Line status: `open` | `on_purchase_order` | `fulfilled` | `withdrawn`.
- No `fulfillment_kind` — purchase path fulfills via receipt; withdraw is explicit. Shop stock / customer parts without a vendor PO: **withdraw** the requisition (or never create one) and log a **`material_receipt`** if physical qty must appear on job inventory.

**What is a material receipt ("receipt document")?**

- The `material_receipt` table — a dated record that **parts landed on the job** (delivery, pickup, stock transfer, customer furnished).
- **Not** the requisition and **not** the `purchase_order`. Example: vendor ships against a purchase order → you receive on site → create `material_receipt` → ledger `job_material_movement` (`receive`) updates on-hand.
- You can receive without a purchase order (`source_kind = stock | customer_supplied`) when there was no vendor buy but parts still hit the job.

**Purchase order:**

- Purchase order Surface picks from open requisition lines; **one draft purchase order per vendor** per batch.
- Job BOM **Order** column is a **DAL rollup** (Requested / On purchase order / Ordered / Received / Withdrawn) — not stored on `job_line_part`.
- `purchase_order_line.requested_order_line_id` + `job_line_part_id` for traceability; ad-hoc purchase order lines leave requisition FK null.
- `purchase_order_line.status` per line (`draft` through `received` \| `rejected`); **split ETAs** on **`purchase_order_line_shipment`** child rows (qty + `eta_date` + `delivered_at` + `received_at` per portion). Single delivery = one shipment with full line qty.
- Header stays **draft** until Send; ad-hoc lines only while draft.

**Job-site inventory (v1 minimal):**

- **Not** org-wide warehouse WMS. Tracks parts **at the job** after receipt.
- `material_receipt` logs inbound; lines post `job_material_movement` (`receive`).
- `issue` / `adjust` / `return_vendor` movements for install and surplus.
- On-hand = ledger rollup per `job_id` × `part_id`; surplus = on hand minus open demand.

**DBML:** Slice **6a procurement** (`TableGroup procurement`) and **6b billing** (`TableGroup billing`) replace the former single `financial` group.

**Deferred:** org warehouse, `delivery_method` catalog (v1 text on PO), auto-send PO, vendor EDI.
