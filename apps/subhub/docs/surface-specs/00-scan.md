# Surface spec scan — v1 inventory

> **Task:** [19-surface-implement-specs.md](../tasks/19-surface-implement-specs.md). **Schema:** [`current.dbml`](../schema/current.dbml). **Field catalog:** [`surfaces.md`](../surfaces.md).

General scan before one-by-one implement specs. **Legend:** ✅ spec complete · 🟡 shipped code exists (spec backfill) · ⬜ pending · 🚫 not a Surface · ➖ wave field-add only

---

## Summary

| Metric | Count |
|--------|------:|
| Surface records to spec | **32** |
| Catalog-table Surfaces | 5 |
| List+detail pairs | 13 |
| Shipped (backfill spec) | 8 |
| DBML tables without Surface | 2 (`phase` — gap; `party_user` — deferred identity) |
| Report pages (wave 7) | 1+ (out of scope for Surface specs) |

**Recommendation:** Still correct to fully plan all Surfaces before implementation code. DBML gives *data* depth; this pass gives *screen + DAL + UI* depth so waves do not re-debate the same patterns.

---

## Progress (update as specs land)

| # | Spec file | Surface(s) | Wave | Spec |
|---|-----------|------------|------|------|
| 1 | [iam-user.md](./iam-user.md) | `user_list` · `user_detail` | 0 | ✅ |
| 2 | [iam-role.md](./iam-role.md) | `role_list` · `role_detail` | 0 | ⬜ |
| 3 | [iam-user-roles.md](./iam-user-roles.md) | `user_roles_detail` | 0 | ⬜ |
| 4 | [customer.md](./customer.md) | `customer_list` · `customer_detail` | 0→1 | ⬜ |
| 5 | [vendor.md](./vendor.md) | `vendor_list` · `vendor_detail` | 0→1 | ⬜ |
| 6 | [manufacturer.md](./manufacturer.md) | `manufacturer_list` · `manufacturer_detail` | 0→1 | ⬜ |
| 7 | [property-owner.md](./property-owner.md) | `property_owner_list` · `property_owner_detail` | 1 | ⬜ |
| 8 | [employee.md](./employee.md) | `employee_list` · `employee_detail` | 0 | ⬜ |
| 9 | [contact-retire.md](./contact-retire.md) | `contact_*` retire | 1 | ⬜ |
| 10 | [site.md](./site.md) | `site_list` · `site_detail` | 1 | ⬜ |
| 11 | [site-contact-relation.md](./site-contact-relation.md) | `site_contact_relation_table` | 1 | ⬜ |
| 12 | [party-addresses.md](./party-addresses.md) | `addresses` on `{role}_detail` | 2 | ⬜ |
| 13 | [site-geography.md](./site-geography.md) | `sections` · `locations` on `site_detail` | 2b | ⬜ |
| 14 | [part.md](./part.md) | `part_list` · `part_detail` | 3 | ⬜ |
| 15 | [item.md](./item.md) | `item_list` · `item_detail` | 3 | ⬜ |
| 16 | [category.md](./category.md) | `category_table` | 3 | ⬜ |
| 17 | [labor-class.md](./labor-class.md) | `labor_class_table` | 3 | ⬜ |
| 18 | [phase.md](./phase.md) | `phase_table` *(add to surfaces.md)* | 3 | ⬜ |
| 19 | [job-party-relation.md](./job-party-relation.md) | `job_party_relation_table` | 4 | ⬜ |
| 20 | [estimate.md](./estimate.md) | `estimate_list` · `estimate_detail` | 4 | ⬜ |
| 21 | [job.md](./job.md) | `job_list` · `job_detail` | 5 | ⬜ |
| 22 | [change-order.md](./change-order.md) | `change_order_list` · `change_order_detail` | 5 | ⬜ |
| 23 | [requested-order.md](./requested-order.md) | `requested_order_list` · `requested_order_detail` | 6a | ⬜ |
| 24 | [purchase-order.md](./purchase-order.md) | `purchase_order_list` · `purchase_order_detail` | 6a | ⬜ |
| 25 | [material-receipt.md](./material-receipt.md) | `material_receipt_list` · `material_receipt_detail` | 6a | ⬜ |
| 26 | [invoice.md](./invoice.md) | `invoice_list` · `invoice_detail` | 6b | ⬜ |
| 27 | [job-billing-fields.md](./job-billing-fields.md) | `billable_items` · `sov_milestones` on `job_detail` | 6b | ⬜ |
| 28 | [notes-attachments.md](./notes-attachments.md) | cross-cutting `notes` / `attachments` | TBD | ⬜ |

---

## DBML ↔ Surface coverage

### Platform (Latch)

| Table | Surface | Notes |
|-------|---------|-------|
| `latch_users` | `user_*` | Platform IAM |
| `latch_roles`, grants, bindings | `role_*`, `user_roles_detail` | |
| `latch_audit` | 🚫 | Append-only; no Surface |
| `latch_*` config | 🚫 | Admin out of v1 |

### Party

| Table | Surface | Notes |
|-------|---------|-------|
| `party` | `{role}_detail` lenses | List filters via `party_role` |
| `party_person`, `party_organization` | 🚫 | Kind extensions on detail `profile` |
| `party_role` | 🚫 | `add_role` / `remove_role` actions |
| `party_phone`, `party_email` | `phones`, `emails` collections | |
| `party_address` + `address` | `addresses` wave 2 | |
| `party_user` | ➖ identity slice | Defer spec with portal |
| `employee` | `employee_detail` | Staff marker; HR later (O7) |
| `note` | cross-cutting | Opt-in per Surface |

### Site

| Table | Surface | Notes |
|-------|---------|-------|
| `site` | `site_*` | |
| `site_contact` | `contacts` on `site_detail` | |
| `site_contact_relation` | `site_contact_relation_table` | |
| `site_section`, `site_location` | `site_detail` wave 2b | DDL wave 1 |

### Catalog

| Table | Surface | Notes |
|-------|---------|-------|
| `manufacturer_part` | `part_*` | |
| `vendor_part` | `vendor_pricing` on `part_detail` | |
| `item` | `item_*` | |
| `item_part_link` | `part_links` | |
| `category` | `category_table` | |
| `labor_class` | `labor_class_table` | |
| `phase` | **`phase_table` — catalog gap** | In DBML; add to `surfaces.md` in spec #18 |

### Estimate / job

| Table | Surface | Notes |
|-------|---------|-------|
| `estimate`, `estimate_line`, `estimate_section`, `estimate_party` | `estimate_detail` | |
| `job_party_relation` | `job_party_relation_table` | |
| `job`, `job_party`, `job_line` | `job_detail` | Tabbed (O4) |
| `job_line_part` | 🚫 | Nested in line DAL |
| `job_work_item` | `work_items` on `job_detail` | |
| `change_order`, `change_order_line` | `change_order_*` | |

### Procurement / billing

| Table | Surface | Notes |
|-------|---------|-------|
| `requested_order*` | `requested_order_*` | |
| `purchase_order*` | `purchase_order_*` | Shipments nested on lines |
| `material_receipt*` | `material_receipt_*` | |
| `job_material_movement` | 🚫 | Ledger / reports |
| `billable_line` | `billable_items` on `job_detail` | Spec #27 |
| `invoice`, `invoice_line` | `invoice_*` | |
| `schedule_of_value`, `sov_line`, `sov_allocation` | `sov_milestones` on `job_detail` | No standalone SOV (O5) |

---

## Catalog tier gaps (fix during specs)

| Gap | Fix in spec # |
|-----|----------------|
| `phase_table` missing from `surfaces.md` | 18 |
| `job_detail` route missing in catalog block | 21 |
| Procurement PO batching one-liner only | 24 |
| `estimate_detail` `win` action undeclared in policy | 20 |
| Cross-cutting notes/attachments per-Surface table incomplete | 28 |
| Wave 2 `addresses` not broken out per lens | 12 |

---

## One-by-one order

Work **top to bottom** in the progress table. Within a wave, order is: **catalog tables → list+detail anchors → field-addendum specs** (addresses, geography, billing fields).

**Session rhythm:** one spec file per conversation; mark ✅ in progress table; fold any catalog fixes back into `surfaces.md`.

---

## Shipped vs target (wave 1 delta)

| Shipped | Retire / replace |
|---------|------------------|
| `contact_list`, `contact_detail`, `/contacts` | Type lenses `customer_detail`, etc. |
| `customer_list`, `vendor_list` (no detail) | Matched detail Surfaces |
| `employee_*` | Keep; align `profile` to `party_person` after refactor |
| Interim `party` columns on `contact_detail` | Kind extensions + lenses |

Detail: [surfaces.md § Wave 0](../surfaces.md#wave-0--party--contacts).
