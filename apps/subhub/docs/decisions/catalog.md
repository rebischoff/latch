# SubHub decisions — catalog

> Parts, items, categories, labor phases, and catalog modeling.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: labor phases — catalog only in v1 (2026-06-17)

**Choice:** Org catalog **`phase`** (prewire, installation, programming, testing, …). Attach on **labor** `estimate_line` / `job_line` via `phase_id` and on **`job_work_item`**.

- **Scope subset:** only create labor lines for phases performed; omit lines for GC/existing work.
- **`labor_class`** remains the **rate bucket**; **`phase`** is the work/reporting kind.
- **Scheduling deferred (v2):** no `scheduled_start` / `job_phase` instance table in v1.

**Rationale:** Phasing for field reporting and labor attachment without Gantt complexity in v1.


### Decision: catalog — simplified parts, items, categories (2026-06-16)

**Choice:**

| Area | Schema |
|------|--------|
| **UOM** | On **`manufacturer_part` only** (`unit`, optional `purchase_unit`, `units_per_purchase`). `vendor_part` has no UOM — price is per part's purchase unit when set. |
| **Vendor catalog** | **`vendor_part`** — vendor PN + current `unit_price` (merged for v1). |
| **Item shapes** | One exact part (`default_part_id`), one-of-many (`item_part_link.link_role = alternate`), or group (`kind = assembly`, `link_role = component`). |
| **Item default cost** | `default_part_id` + `default_vendor_part_id` → `vendor_part.unit_price` (DAL handles unit conversion). |
| **Labor** | **`labor_class`** = rate bucket on labor items. Catalog BOM is **`item_part_link` only** (parts). Labor bundles = multiple `estimate_line` rows or standalone labor items — no `item_item_link`. |
| **Categories** | Single **`category`** tree (`parent_id`). Optional **`csi_code`** when org uses CSI MasterFormat — no `classification_system` / parallel commercial taxonomy. |
| **Quote grouping** | `estimate_section.category_id` (and optional `estimate.category_id`) — **not** per line. |
| **Expense / rental** | `item.kind = expense` for travel, per diem; equipment rental may be expense item or `job_party` subcontractor. |

**Rationale:** One category concept covers merchandising and optional CSI alignment. UOM on the manufacturer part avoids vendor/part unit mismatch. `item_part_link` covers all part composition; `labor_class` tags labor items for rates when labor is quoted as its own line.
