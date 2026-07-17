# 53 — Purchase-order workbench (wave 6a″)

> **Status:** Stub (2026-07-16). Author full steps after [52](./52-requisition-surfaces.md) Step 0 / when starting PO. **Depends on:** [52](./52-requisition-surfaces.md) (`requested_order*` + `purchase_order*` DDL).
>
> **Decision:** [R5 / R6](../decisions/procurement.md#decision-requisition-surfaces-ux-r1r8-2026-07-16).

**Goal (locked intent):** PO Surface / workbench selects open requisition lines across jobs; purchaser picks vendor when multiple; **Create POs** emits **one draft PO per job × vendor**; Send issues PO; req lines → `on_purchase_order`; req UI shows PO # + status.

**Out of scope:** Receipts (**54**); ready UI (R7); cross-job single PO header.

---

## Skeleton (expand at authoring)

1. Surfaces: `purchase_order_list` / `purchase_order_detail` + workbench select UI  
2. DAL: batch create from selected `requested_order_line` ids + vendor map  
3. Send action; line/shipment defaults (single shipment = full qty)  
4. Tests + STATUS  

---

## Related

- [52](./52-requisition-surfaces.md)
- [planning/19](../planning/19-requisition-surfaces-open.md)
