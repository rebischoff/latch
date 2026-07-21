# SubHub decisions — procurement

> Requisitions, purchase orders, receipts, and job-site inventory.

[Index](./README.md) · [All decisions](../decisions/README.md)

**Wave 6a Surfaces (R1–R8):** **Locked** 2026-07-16 — [`planning/19-requisition-surfaces-open.md`](../planning/19-requisition-surfaces-open.md). Layer model below stays locked; do not re-litigate.

**Amended 2026-07-17:** Field zone Order compose — [`planning/20`](../planning/20-field-labor-materials-open.md); task [55](../tasks/55-field-progress-reports-zone-order.md).

**Amended 2026-07-20:** Purchaser PO pool chrome moves to `/requisitions` (fold workbench) — [RQ-UI1–RQ-UI8](#decision-requisitions--po-pool-ux-fold-workbench-rq-ui1rq-ui8-2026-07-20); task [58](../tasks/58-requisitions-po-pool-ux.md).

**Amended 2026-07-20:** Snapshot `item_id` on demand + pool/PO description rules — [IT1–IT8](#decision-material-request-item_id--poolpo-descriptions-it1it8-2026-07-20); task [59](../tasks/59-material-request-item-id-and-descriptions.md).

### Decision: Material request `item_id` + pool/PO descriptions (IT1–IT8) (2026-07-20)

**Status:** **Locked**. **Task:** [59](../tasks/59-material-request-item-id-and-descriptions.md). **Amends:** Field ☐ Order write ([Field zone Order](#decision-field-zone-order--requisition-snapshots-2026-07-17)); `/requisitions` column chrome ([RQ-UI3](#decision-requisitions--po-pool-ux-fold-workbench-rq-ui1rq-ui8-2026-07-20) *display* — **keeps** rollup key **`job × part`**); Create POs / PO9 line seed text ([53](../tasks/53-purchase-order-workbench.md)). **Keeps:** RQ-UI3 rollup; RQ-UI5 staged PN; one draft PO per job × vendor.

| Id | Choice |
|----|--------|
| **IT1** | Snapshot **`item_id`** on `job_material_request` when Field ☐ Order creates demand — from **`job_line.item_id`** via `job_line_part`. **Not** inferred from current/staged PN. Same Item semantics as Job → Field Item (`item.name`, else line description). |
| **IT2** | Also store **`item_id`** on **`purchase_order_line`**. Copy from source JMR at Create POs / PO9. |
| **IT3** | Null `job_line.item_id` → store null (do not block Order). Ad-hoc / no `job_line_part` → null. Create POs copies null through. |
| **IT4** | Rollup stays **`job × part`**. When a row merges requests with **>1 distinct `item_id`**, Item column shows **Multiple**; Part # Select options = **union** of those items’ linked parts. Single `item_id` → narrow Part # by that item. |
| **IT5** | `/requisitions` columns (after zone): **Qty** · **Item** (read-only) · **Part #** · **Description** · Vendor. Description = **`manufacturer_part.description`** for the row’s (staged) PN — **not** Item / `item_id`. Soft-spec / blank PN → **`jmr.description`** until a PN exists. Staged PN change → Description **live-updates** to that MPN’s description. |
| **IT6** | PO line **seed** description = `vendor_part.vendor_description \|\| manufacturer_part.description \|\| jmr.description`. Purchaser may **override** on the PO (draft edit kept; not re-derived on every load). |
| **IT7** | Migration **backfills** `job_material_request.item_id` (and existing PO lines where joinable) via `job_line_part → job_line.item_id`. |
| **IT8** | Item on pool is display + PN-narrowing context only — not a rollup key and not editable on `/requisitions`. |

**Rationale:** Purchasers change PN on the pool; the catalog item from Field Order is the sticky filter/context. Rollup by part matches how buys group. Vendor text belongs on the PO (with MPN fallback); pool Description follows the manufacturer PN the row is aiming at.

### Decision: Requisitions = PO pool UX (fold workbench) (RQ-UI1–RQ-UI8) (2026-07-20)

**Status:** **Locked**. **Task:** [58](../tasks/58-requisitions-po-pool-ux.md). **Amends:** R5 *route/chrome* ([R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16), [purchaser batch](#decision-purchaser-batch--select-on-po-workbench--one-po-per-job×vendor-r5-2026-07-16)); task 53 Step 1 separate `/purchase-orders/workbench` screen. **Keeps:** R5 grouping (**one draft PO per job × vendor**); `purchase_order_line_source` rollup; PO list/detail for Send / cancel / ad-hoc (PO1–PO9). **RQ-UI2 amend (same day):** no All-jobs view.

| Id | Choice |
|----|--------|
| **RQ-UI1** | Nav label **Requisitions** (`/requisitions`; entity stays `job_material_request`) |
| **RQ-UI2** | Job dropdown = **required job picker** (jobs with ≥1 open request only; **no All jobs**). Table shows that job’s rollup |
| **RQ-UI3** | Table = open demand rolled up by **`job × part`** (never cross-job). Soft-spec / unnarrowed → blank PN |
| **RQ-UI4** | Zone column = **icon only**; click → popover of contributing zones (optional per-zone qty when decreasing) |
| **RQ-UI5** | PN editable (pick/change; blank = TBD). Applied at **Create POs**, not live Field mutation while typing |
| **RQ-UI6** | Qty / zone: **decrease only** (≤ open ask). No increase / no add-zone here (increase = PO detail ad-hoc, PO9) |
| **RQ-UI7** | Vendor defaulted; override allowed. Header + row checkboxes for Create POs |
| **RQ-UI8** | After Create POs: **stay on `/requisitions`**. Delete `/purchase-orders/workbench` with **no redirect** |

**Screen role:** `/requisitions` is the **open-demand PO pool**, not a flat all-status history list. Full-status history on this route is **deferred**; PO # / status trail for committed demand lives on PO Surfaces (R6 intent preserved via PO detail + sources).

**Rationale:** Separate workbench duplicated the same `job_material_request` table with a thinner chrome. Purchasers think “requisitions → create POs”; picking a job focuses the pool on that job’s open demand.

### Decision amend: RQ-UI2 — no All-jobs view (2026-07-20)

**Choice:** Job dropdown lists only jobs with open requests; one job is always selected (auto-select first). No “All jobs” table / cross-job Create POs from this screen.

**Rationale:** Implementation pull preferred a job-scoped pool; multi-job batches remain possible by creating POs per job visit (grouping rule unchanged: one draft PO per job × vendor).

### Decision: Field zone Order → requisition snapshots (2026-07-17)

**Status:** **Locked**. **Planning:** [20](../planning/20-field-labor-materials-open.md). **Task:** [55](../tasks/55-field-progress-reports-zone-order.md). **Amends:** R1 primary compose (Field ☐ Order); task 52 “no geography on req lines” → nullable `site_zone_id`. **Keeps:** R3 remaining caps; R4 many headers; R5 PO per job×vendor; R6 PO trail; freeze/withdraw. **Amended 2026-07-20:** Field-direct ad-hoc (**AH1–AH3**) **superseded** — see [FI1–FI12](./job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20); planned extras enter via **Scope → Line Items**; JMR create paths = Field ☐ Order + purchaser PO9 only (not Field “+ Add material”).

| Topic | Choice |
|-------|--------|
| Compose | Job → Field ☐ **Order** (leaf all-or-nothing; parent cascade) |
| Save | Order-changing Job Save → **new** `requested_order` + lines (diff-aware) |
| Zone | `requested_order_line.site_zone_id` (null = General); Order checkbox **derived** from lines |
| Qty | BOM remaining attributable to zone (L22); soft-spec description OK (L18); empty TBD blocked |
| Ad-hoc / plan entry | **Scope → Line Items → Add line** (L9 restored). Field Issues may *signal* a material need (free text) but do not create demand ([FI1](./job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20)) |
| List | `/requisitions` kept for purchaser (**PO pool** after [RQ-UI](#decision-requisitions--po-pool-ux-fold-workbench-rq-ui1rq-ui8-2026-07-20)); Field is primary Order path |
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
| **R5** | Select open demand (cross job); vendor pick; **one draft PO per job × vendor**. **Chrome (2026-07-20):** on `/requisitions` pool UI — see [RQ-UI1–RQ-UI8](#decision-requisitions--po-pool-ux-fold-workbench-rq-ui1rq-ui8-2026-07-20) |
| **R6** | Req / source trail shows **PO number + status** (link); shipping on req deferred. Open-pool screen no longer lists on-PO rows (see RQ-UI screen role) |
| **R7** | Ready-pool **UI deferred**; P2 formula unchanged |

**Amends:** “one draft PO per vendor per batch” → **per job × vendor**. **Amended 2026-07-20:** R5 selection chrome → `/requisitions` (fold `/purchase-orders/workbench`).

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

**Status:** **Locked** (rolled into [R1–R8](#decision-requisition-surfaces-ux-r1r8-2026-07-16)). **Amends:** “one draft PO per vendor per batch” → **one draft PO per job × vendor**. **Amended 2026-07-20:** selection chrome lives on `/requisitions` — [RQ-UI1–RQ-UI8](#decision-requisitions--po-pool-ux-fold-workbench-rq-ui1rq-ui8-2026-07-20); delete separate `/purchase-orders/workbench`.

**Choice:**

1. **Select** open demand (`job_material_request`, formerly `requested_order_line`) on the **requisitions PO pool** (across jobs). Selection is UI state — status stays `open` until POs are created.
2. **Vendor** — purchaser picks `vendor_part` / vendor when multiple exist for the part; single option defaults (overrideable).
3. **Batch create** — emit **one draft `purchase_order` per `(job_id, vendor_party_id)`**; attach lines via `purchase_order_line_source`; set requests to `on_purchase_order`.

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
