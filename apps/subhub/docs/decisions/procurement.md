# SubHub decisions — procurement

> Requisitions, purchase orders, receipts, and job-site inventory.

[Index](./README.md) · [All decisions](../decisions/README.md)

**Wave 6a Surfaces (R1–R8):** **Locked** 2026-07-16 — [`planning/19-requisition-surfaces-open.md`](../planning/19-requisition-surfaces-open.md). Layer model below stays locked; do not re-litigate.

**Amended 2026-07-17:** Field zone Order compose — [`planning/20`](../planning/20-field-labor-materials-open.md); task [55](../tasks/55-field-progress-reports-zone-order.md).

### Decision: Field zone Order → requisition snapshots (2026-07-17)

**Status:** **Locked**. **Planning:** [20](../planning/20-field-labor-materials-open.md). **Task:** [55](../tasks/55-field-progress-reports-zone-order.md). **Amends:** R1 primary compose (Field ☐ Order); task 52 “no geography on req lines” → nullable `site_zone_id`. **Keeps:** R3 remaining caps; R4 many headers; R5 PO per job×vendor; R6 PO trail; freeze/withdraw.

| Topic | Choice |
|-------|--------|
| Compose | Job → Field ☐ **Order** (leaf all-or-nothing; parent cascade) |
| Save | Order-changing Job Save → **new** `requested_order` + lines (diff-aware) |
| Zone | `requested_order_line.site_zone_id` (null = General); Order checkbox **derived** from lines |
| Qty | BOM remaining attributable to zone (L22); soft-spec description OK (L18); empty TBD blocked |
| Ad-hoc | Scope add line first |
| List | `/requisitions` kept for purchaser/history; Field is primary Order path |
| Re-request | Allowed via new open demand after return/bad part |

**Rationale:** Zone-staged pulls match Field geography; snapshot headers preserve “what we asked when”; purchaser batching unchanged.

### Decision: requisition Surfaces UX (R1–R8) (2026-07-16)

**Status:** **Locked**. **Planning:** [19](../planning/19-requisition-surfaces-open.md). **Amended** by [Field zone Order](#decision-field-zone-order--requisition-snapshots-2026-07-17) for compose entry (Field primary).

| # | Choice |
|---|--------|
| **R1 / R8** | **Primary:** Job → Field ☐ Order. **Also:** list → New / Job Request parts (secondary). Same `requested_order*` documents |
| **R2** | BOM still-needed (via Field zone Order) **plus** freeform ad-hoc / soft-spec |
| **R3** | BOM qty editable, **capped at job-wide remaining** |
| **R4** | Many requisition headers per job; remaining / Order rollup **job-wide** |
| **R5** | PO workbench selects open lines (cross job/req); vendor pick; **one draft PO per job × vendor** |
| **R6** | Req line shows **PO number + status** (link); shipping on req deferred |
| **R7** | Ready-pool **UI deferred**; P2 formula unchanged |

**Amends:** “one draft PO per vendor per batch” → **per job × vendor**.

**Rationale:** PM/tech request from the job or list; purchaser batches buys without cross-job PO headers; ship 6a CRUD before scheduling chrome.

### Decision: requisition Surfaces — create entry (R1) (2026-07-16)

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)).

**Choice:** **Both** create paths (R1-C):

1. **Requisitions** list → New → pick `job_id`.
2. **Job** → **Request parts** → `/requisitions/new?jobId=` (job prefilled).

Same `requested_order_detail` Surface either way. Job chrome is not link-only — **Request parts** is a first-class action (closes R8 with R1).

**Rationale:** PM/tech usually starts from the job; purchaser and admins still need list → New → pick job.

### Decision: requisition Surfaces — line source (R2) (2026-07-16)

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)).

**Choice:** **Both** (R2-C):

- **BOM pool** — pick `job_line_part` rows still needing order (remaining qty from procurement rollup).
- **Freeform** — add ad-hoc / TBD lines (`part_id` and/or description; null `job_line_part_id`).

**Rationale:** Engineered demand is the default path; field still needs “not on the BOM yet” without forcing a BOM edit first.

### Decision: requisition Surfaces — BOM qty (R3) (2026-07-16)

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)).

**Choice:** **Editable, cap at remaining** (R3-C):

- Default qty = remaining need for that `job_line_part`.
- Operator may lower (phased pulls).
- Over-request vs remaining is rejected/capped; need more → freeform line or revise BOM.

**Rationale:** Supports staged material pulls without inventing phantom BOM demand.

### Decision: requisition Surfaces — many headers + job-wide remaining (R4) (2026-07-16)

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)).

**Choice:** **Many requisition headers per job** (R4-B). Optional `phase_id` batch tag.

**Remaining need / Order rollup is job-wide:** for each `job_line_part`, sum requested qty across **all** requisitions on that job (exclude `withdrawn`), plus PO/receipt coverage. A second requisition must not re-offer full BOM qty — pool default/cap uses that remaining.

**Rationale:** Prewire vs trim (and separate requesters) need separate headers; demand accounting stays on the job BOM, not per document.

### Decision: purchaser batch — select on PO workbench → one PO per job×vendor (R5) (2026-07-16)

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)). **Amends:** “one draft PO per vendor per batch” → **one draft PO per job × vendor**.

**Choice:**

1. **Select** open `requested_order_line`s on the **PO Surface / workbench** (across jobs and requisitions). Selection is workbench state — req status stays `open` until POs are created.
2. **Vendor** — purchaser picks `vendor_part` / vendor when multiple exist for the part; single option defaults (overrideable).
3. **Batch create** — emit **one draft `purchase_order` per `(job_id, vendor_party_id)`**; attach lines; set req lines to `on_purchase_order` with `purchase_order_line.requested_order_line_id`.

**Rejected v1:** one PO header spanning multiple jobs.

**Rationale:** Purchaser thinks in “what to buy from whom”; costing and job committed stay job-scoped.

### Decision: requisition line shows PO number + status (R6) (2026-07-16)

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)).

**Choice:** Req line UI shows joined **PO number + status**, with link to PO detail (R6-B).

**Deferred:** Vendor shipping / ETA / shipment detail on the requisition — stay on PO / `purchase_order_line_shipment` for now; mirror later if needed.

**Rationale:** “Which PO?” is the first question after order; richer logistics can land later without blocking 6a.

### Decision: ready-pool UI deferred (R7) (2026-07-16)

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)).

**Choice:** **Defer ready filter/highlight UI** in first wave 6a Surfaces (R7-D). P2 formula (`order_by = target_date − lead_time`) remains locked; manual request/order always allowed. Add ready chrome in a follow-on when targets + lead times are routinely filled.

**Rationale:** Ship requisition/PO CRUD without depending on incomplete schedule data.

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
