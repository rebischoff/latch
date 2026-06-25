# Surface spec scan — v1 inventory

> **Spec task:** [19-surface-implement-specs.md](../tasks/19-surface-implement-specs.md) — **16/27** complete. **Schema:** [`current.dbml`](../schema/current.dbml). **Field catalog:** [`surfaces.md`](../surfaces.md).

General scan before one-by-one implement specs. **Legend:** ✅ spec complete · 🟡 shipped code exists (spec backfill) · ⬜ pending · ⏸ deferred until after UI discovery · 🚫 not a Surface · ➖ wave field-add only

---

## Summary

| Metric | Count |
|--------|------:|
| Surface records to spec | **32** |
| Spec checkpoint (task 19) | **16** files ✅ (rows #1–14, #19–21) |
| Deferred pending discovery | **11** rows (#15–18, #22–28) |
| Shipped (backfill spec) | 8 |

**Process (2026-06-20):** CRM hub specs are enough to **build** sites + run estimate spike ([task 20](../tasks/20-ui-discovery.md)). Resume spec rows **#15–28** after planning session — **`estimate.md` before `item.md`**. See [planning decision](../decisions/general.md#decision-planning-model--ui-discovery-before-ops-specs-2026-06-20).

---

## Progress (update as specs land)

| # | Spec file | Surface(s) | Wave | Spec |
|---|-----------|------------|------|------|
| 1 | [iam-user.md](./iam-user.md) | `user_list` · `user_roles_detail` | 0 | ✅ target (2026-06-18); code interim |
| 2 | [iam-role.md](./iam-role.md) | `role_list` · `role_detail` | 0 | ✅ target (2026-06-18); code interim |
| 3 | — | `user_roles_detail` · `role_assignments` | 0 | ↪ **merged** into [iam-user.md](./iam-user.md) (2026-06-18) |
| 4 | [customer.md](./customer.md) | `customer_list` · `customer_detail` | 0→1 | ✅ target (2026-06-18) |
| 5 | [vendor.md](./vendor.md) | `vendor_list` · `vendor_detail` | 0→1 | ✅ target (2026-06-18) |
| 6 | [manufacturer.md](./manufacturer.md) | `manufacturer_list` · `manufacturer_detail` | 0→1 | ✅ target (2026-06-18); list shipped |
| 7 | [property-owner.md](./property-owner.md) | `property_owner_list` · `property_owner_detail` | 1 | ✅ target (2026-06-18) |
| 8 | [employee.md](./employee.md) | `employee_list` · `employee_detail` | 0 | ✅ target (2026-06-19) |
| 9 | [contact-retire.md](./contact-retire.md) | `contact_*` retire | 1 | ✅ target (2026-06-19) |
| 10 | [site.md](./site.md) | `site_list` · `site_detail` | 1 | ✅ target (2026-06-19) |
| 11 | [site-contact-relation.md](./site-contact-relation.md) | `site_contact_relation_table` | 1 | ✅ target (2026-06-19) |
| 12 | [party-addresses.md](./party-addresses.md) | `addresses` on `{role}_detail` | 2 | ✅ target (2026-06-19) |
| 13 | [site-geography.md](./site-geography.md) | `sections` · `locations` on `site_detail` | 2b | ✅ target (2026-06-19) |
| 14 | [part.md](./part.md) | `part_list` · `part_detail` | 3 | ✅ target (2026-06-19); code shipped (3a) |
| 15 | [item.md](./item.md) | `item_list` · `item_detail` | 3 | ⏸ after discovery |
| 16 | [category.md](./category.md) | `category_table` | 3 | ⏸ after discovery |
| 17 | [labor-class.md](./labor-class.md) | `labor_class_table` | 3 | ⏸ after discovery |
| 18 | [phase.md](./phase.md) | `phase_table` *(add to surfaces.md)* | 3 | ⏸ after discovery |
| 19 | [job-party-relation.md](./job-party-relation.md) | `job_party_relation_table` | 4 | ✅ target (2026-06-23); code shipped |
| 20 | [estimate.md](./estimate.md) | `estimate_list` · `estimate_detail` | 4 | ✅ target (2026-06-23) |
| 21 | [job.md](./job.md) | `job_list` · `job_detail` | 5 | ✅ target (2026-06-23) |
| 22 | [change-order.md](./change-order.md) | `change_order_list` · `change_order_detail` | 5 | ⏸ after discovery |
| 23 | [requested-order.md](./requested-order.md) | `requested_order_list` · `requested_order_detail` | 6a | ⏸ after discovery |
| 24 | [purchase-order.md](./purchase-order.md) | `purchase_order_list` · `purchase_order_detail` | 6a | ⏸ after discovery |
| 25 | [material-receipt.md](./material-receipt.md) | `material_receipt_list` · `material_receipt_detail` | 6a | ⏸ after discovery |
| 26 | [invoice.md](./invoice.md) | `invoice_list` · `invoice_detail` | 6b | ⏸ after discovery |
| 27 | [job-billing-fields.md](./job-billing-fields.md) | `billable_items` · `sov_milestones` on `job_detail` | 6b | ⏸ after discovery |
| 28 | [notes-attachments.md](./notes-attachments.md) | cross-cutting `notes` / `attachments` | TBD | ⏸ after discovery |

---

## DBML ↔ Surface coverage

### Platform (Latch)

| Table | Surface | Notes |
|-------|---------|-------|
| `latch_users` | `user_*` (join) | Credentials; IAM list anchors `party_person` |
| `latch_roles`, grants, bindings | `role_*`, `user_roles_detail` | |
| `latch_audit` | 🚫 | Append-only; no Surface |
| `latch_*` config | 🚫 | Admin out of v1 |

### Party

| Table | Surface | Notes |
|-------|---------|-------|
| `party` | `{role}_detail` lenses | List filters via `party_role` |
| `party_person` | `user_list`, `user_roles_detail`, `{role}_detail` `profile` | Login link + session chrome; IAM lens when linked |
| `party_organization` | org `{role}_detail` `profile`, `parent_customer`, subsidiaries | `parent_party_id` — hub wave |
| `party_contact` + `party_contact_relation` | `contacts` on org `customer_detail` / `vendor_detail` | catalog table spec TBD |
| `party_role` | 🚫 | `add_role` / `remove_role` actions |
| `party_phone`, `party_email` | `phones`, `emails` collections | `is_login_email` on `party_email`; sync to `latch_users.login_email` |
| `party_address` + `address` | `addresses` wave 2 | [`party-addresses.md`](./party-addresses.md) |
| `employee` | `employee_detail` | Staff marker; `add_as_db_user` provision |
| `note` | cross-cutting | Opt-in per Surface |

### Site

| Table | Surface | Notes |
|-------|---------|-------|
| `site` | `site_*` | `customer_party_id` — portfolio hub ([site decision](../decisions/site.md)) |
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
| `estimate_detail` `win` / `lose` actions | 20 — ✅ in [`estimate.md`](./estimate.md) § C |
| Cross-cutting notes/attachments per-Surface table incomplete | 28 |
| `party_contact_relation_table` missing from catalog | customer / party-contact spec |

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
