# SubHub — Surface & Field catalog

> **Status:** Complete (2026-06-17). Canonical UI/policy contract for v1. **Schema:** [`schema/current.dbml`](./schema/current.dbml). **Catalog task:** [tasks/18-surface-catalog.md](./tasks/18-surface-catalog.md) (complete).
>
> Field-level detail here; headline slice map stays in [`architecture.md`](./architecture.md#surface-catalog). Child-collection patch semantics: [`child-collections.md`](./child-collections.md). **Implement specs:** [`surface-specs/`](./surface-specs/README.md) — task 19 checkpoint. **Active build:** [task 20 — UI discovery](./tasks/20-ui-discovery.md).

## Conventions

| Term | Rule |
|------|------|
| **List + detail** | Business anchors: `{entity}_list` + `{entity}_detail` — master-detail routes |
| **Catalog table** | Small FK lookup tables: `{table}_table` — single editable table page ([decision](./decisions/general.md#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16)) |
| **Scalar Field** | Maps 1+ columns on anchor or profile object |
| **Collection Field** | Logical array — child rows; v1 PATCH replaces whole array |
| **Surface actions** | `read`, `write`, `delete` unless noted |
| **Timestamps** | `created_at` / `updated_at` on anchors for list sort — **omit** from Surface YAML unless manifest-gated display is required ([decision](./decisions/general.md#decision-row-timestamps-vs-audit--ddl-vs-surface-fields-2026-06-13)) |
| **Delivery wave** | Implementation order after catalog exits — not a design boundary |

### Per-Surface record (template)

Each entry below uses this shape:

| Key | Meaning |
|-----|---------|
| **Status** | `shipped` · `draft` · `deferred` |
| **Wave** | When to build (see [Implementation waves](#implementation-waves)) |
| **Route** | App Router path |
| **Nav group** | Sidebar `group` in `lib/nav.ts` |
| **Anchor** | Primary table for policy scope |
| **Tables** | All tables read/written by DAL for this Surface |
| **List columns** | Columns on `*_list` only |
| **Detail Fields** | Scalar + collection Fields on `*_detail` |
| **Notes** | DAL rules, deferrals, open decisions |

---

## Not a Surface

These tables are accessed only via parent Surfaces or DAL internals — no standalone screen in v1.

| Table | Accessed via |
|-------|----------------|
| `address` | `party_address` collection on `{role}_detail` |
| `party_person`, `party_organization` | Kind extensions — Fields on `{role}_detail` / `employee_detail` *(wave 1 refactor)* |
| `note` | `notes` collection — **opt-in** per Surface ([cross-cutting](#cross-cutting-fields-notes-attachments)); UI deferred |
| `attachment` | `attachments` collection — opt-in per Surface; table + UI deferred |
| `party_phone`, `party_email` | `phones`, `emails` on `{role}_detail` lenses |
| `party_role` | Auto-tag on create per lens; add/remove via explicit actions — **no** multi-select on detail forms |
| `party_address` | `addresses` on `{role}_detail` *(wave 2)* |
| `site_section`, `site_location` | `sections`, `locations` on `site_detail` *(wave 2b)* |
| `site_contact` | `contacts` on `site_detail` |
| `estimate_section` | Commercial `quote_sections` on `estimate_detail` — not site geography |
| `estimate_party`, `job_party` | `stakeholders` collection on estimate/job detail |
| `job_line_part` | Nested under `job_line` engineering / BOM — DAL-only or sub-field |
| `job_work_item` | `work_items` nested on `job_detail` |
| `billable_line` | `billable_items` on `job_detail` — no `billable_line_list` |
| `invoice_line` | `line_items` on `invoice_detail` |
| `sov_line`, `sov_allocation` | `sov_milestones` on `job_detail` Billing tab — no standalone SOV Surface ([decision](./decisions/billing.md#decision-sov-ui--nested-on-job_detail-billing-tab-2026-06-17)) |
| `item_part_link` | `part_links` on `item_detail` |
| `vendor_part` | `vendor_pricing` on `part_detail` |
| `purchase_order_line`, `purchase_order_line_shipment` | Lines on `purchase_order_detail` |
| `requested_order_line` | Lines on `requested_order_detail` |
| `material_receipt_line` | Lines on `material_receipt_detail` |
| `change_order_line` | `line_items` on `change_order_detail` |
| `job_material_movement` | Inventory ledger — DAL/reporting; no list Surface v1 |

---

## Open decisions

Resolve during [task 18](./tasks/18-surface-catalog.md) before implementation waves resume.

| # | Topic | Options | Blocks |
|---|-------|---------|--------|
| O1 | ~~Party list/detail + lens model~~ | **Locked 2026-06-17** — matched pairs, lenses, no `/contacts`, no `roles` picker — [decision](./decisions/party.md#decision-party-listdetail-surface-shape-2026-06-16-locked-2026-06-17) | — |
| O2 | ~~Party profile + notes~~ | **Locked 2026-06-17** — kind-specific profile; notes/attachments UI deferred ([decision](./decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)) | — |
| O3 | ~~`estimate_detail` line editor~~ | **Locked 2026-06-17** — site-owned geography; grouped when section/location used, else flat ([decision](./decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17)) | — |
| O4 | ~~`job_detail` layout~~ | **Locked 2026-06-17** — tabbed: Overview / Scope / Field / Billing ([decision](./decisions/job.md#decision-job_detail-layout--tabbed-2026-06-17)) | — |
| O5 | ~~SOV UI placement~~ | **Locked 2026-06-17** — `sov_milestones` on `job_detail` Billing tab only; no standalone SOV Surface ([decision](./decisions/billing.md#decision-sov-ui--nested-on-job_detail-billing-tab-2026-06-17)) | — |
| O6 | ~~Site geography timing~~ | **Locked 2026-06-17** — wave 1 DDL only; UI wave 2b; estimates flat until registry exists ([decision](./decisions/site.md#decision-site-geography-on-site_detail--timing-2026-06-17)) | — |
| O7 | ~~`employee_detail` scope~~ | **Locked 2026-06-17** — staff marker through wave 1+; HR Fields with identity slice ([decision](./decisions/party.md#decision-employee_detail-scope--marker-now-hr-later-2026-06-17)) | — |

_All open decisions resolved (2026-06-17). Implement specs: task 19 (checkpoint ✅ CRM). **Build:** [task 20](./tasks/20-ui-discovery.md)._

## Cross-cutting Fields (notes, attachments) {#cross-cutting-fields-notes-attachments}

> **Global pattern** — polymorphic `note` / `attachment` tables; **not** on every Surface. Declare `notes` and/or `attachments` only where the catalog below lists them. Multiple rows per entity. **UI deferred** past wave 1 ([decision](./decisions/cross-cutting.md#decision-notes-and-attachments--shared-tables-deferred-2026-06-15).

| Surface | `notes` | `attachments` | When |
|---------|---------|-----------------|------|
| `{role}_detail` (party lenses) | planned | planned | cross-cutting slice |
| `site_detail` | planned | planned | cross-cutting slice |
| `estimate_detail` | planned | — | cross-cutting slice |
| `job_detail` | planned | planned | cross-cutting slice |
| `invoice_detail` | — | — | — |
| `purchase_order_detail` | planned | planned | cross-cutting slice |

Extend this table as slices are designed. Wave 1 party lenses ship **without** `notes` / `attachments` Fields.

---

## Implementation waves

Design is holistic; **ship** in waves after catalog exits.

| Wave | Scope | Migration backlog |
|------|--------|-------------------|
| **0** | App shell + IAM + contacts | `001`–`017` shipped |
| **1** | Party refactor + sites (minimal UI) | [`deferred/site-migration.md`](./tasks/deferred/site-migration.md) |
| **2** | `party_address` on contacts; site geography on `site_detail` | TBD after wave 1 |
| **3** | Catalog (parts, items, categories) | TBD |
| **4** | Estimates | TBD |
| **5** | Jobs + change orders | TBD |
| **6a** | Procurement (requisition, PO, receipts) | TBD |
| **6b** | Billing (billable staging, invoices, SOV) | TBD |
| **7** | Reports | Custom SQL pages — not Surfaces initially |

---

## Wave 0 — IAM (shipped)

### `user_list` · `user_detail` · `user_roles_detail`

| | |
|--|--|
| **Status** | shipped code (interim); **target spec** [iam-user.md](./surface-specs/iam-user.md) (2026-06-18) |
| **Wave** | 0 |
| **Route** | `/users`, `/users/[id]` |
| **Nav group** | IAM |
| **Anchor (target)** | `party_person` — lens `latch_user_id IS NOT NULL` |
| **Anchor (shipped)** | `latch_users` — catch up at identity wave |

**Purpose:** IAM directory for **existing** linked app users — roles + password actions on `user_roles_detail`. **Provision** new logins: person surface **Add User** → **`/users/new`** ([`iam-user.md`](./surface-specs/iam-user.md), [provision decision](./decisions/party.md#decision-provision-app-user-from-person-surface-2026-06-25)). **No** list **New** in v1.

**`user_list` Fields (target):** `summary` → person chrome + login identifiers — `party_person` (`party_id`, `display_name`, `nick_name`, `avatar_url`), joined `latch_users.login_name`, `latch_users.login_email`.

**`user_roles_detail`:** role bindings — joins `party_person` → `latch_users` → `latch_user_roles`

### `role_list` · `role_detail`

| | |
|--|--|
| **Status** | shipped code (interim); **target spec** [iam-role.md](./surface-specs/iam-role.md) (2026-06-18) |
| **Wave** | 0 |
| **Route** | `/roles`, `/roles/[id]` |
| **Nav group** | IAM |
| **Anchor** | `latch_roles` |

**Purpose:** Role **definitions** — catalog row, per-surface `row_scope` bindings, sparse allow-grants. Sibling of `user_roles_detail` (assignments). See [iam-role.md](./surface-specs/iam-role.md).

**`role_list` Fields:** `summary` → `id`, `role_class`, `display_name`.

**`role_detail` Fields:** `catalog` (name, `role_class`); `surface_bindings` + `grants` (grant matrix) — **`app` roles only in UI**; system classes show catalog only ([iam-role.md](./surface-specs/iam-role.md)).

**`user_roles_detail`:** role bindings for a linked app user — [`iam-user.md`](./surface-specs/iam-user.md) § `role_assignments`.

---

## Wave 0 — Party / contacts

> **O1 locked (2026-06-17):** Role subset **list + matched detail lens** per master tag. **No** `/contacts`. Shared form/DAL; separate Surface YAML and grants per pair. See [Party surface pairs](#party-surface-pairs).

### Party surface pairs {#party-surface-pairs}

| Master tag | List | Detail (lens) | Route | Status |
|------------|------|---------------|-------|--------|
| `customer` | `customer_list` | `customer_detail` | `/customers` | list shipped; **detail new** |
| `vendor` | `vendor_list` | `vendor_detail` | `/vendors` | list shipped; **detail new** |
| `manufacturer` | `manufacturer_list` | `manufacturer_detail` | `/manufacturers` | list shipped; **detail target spec** |
| `property_owner` | `property_owner_list` | `property_owner_detail` | `/property-owners` | **new** |
| `employee` | `employee_list` | `employee_detail` | `/employees` | shipped (anchor `employee`) |

**Retired in wave 1:** `contact_list`, `contact_detail`, `/contacts` — [retirement spec](./surface-specs/contact-retire.md); type lens pairs replace interim UI.

No `other_list`. Tag `other` → pickers / future global search only.

**Lens model:** One `party.id` may open multiple detail URLs (e.g. same org on `/customers/[id]` and `/vendors/[id]`). Base Fields edit shared data; lens-specific Fields only on that Surface. Read-only **Also: …** chips link to sibling lenses. **Add role** / **remove role** = explicit toolbar actions — not a `roles` form Field.

**Grants:** Per explicit `surface_id` — e.g. `customer_list` + `customer_detail` for full customer CRUD. No wildcard.

**Shared code (not shared Surfaces):**

- UI — `PartyDetailForm`, `PartyListLayout` (props: `surfaceId`, manifest)
- DAL — `lib/contacts/repository.ts` + descriptor factory keyed by role tag
- API — explicit routes per type; shared handler factory

**Base detail Fields** (all `{role}_detail` lenses on anchor `party` unless noted) — wave 1:

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | **Person:** `first_name`, `last_name` (`party_person`). **Org:** `legal_name`, `dba_name`. `kind` at create. `display_name` DAL-maintained for lists — not primary edit field ([decision](./decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17)) |
| `phones` | collection | `party_phone` |
| `emails` | collection | `party_email` — include `is_login_email` when person has login; sync → `latch_users.login_email` ([decision](./decisions/party.md#decision-login-email--app-sync-to-latch_userslogin_email-2026-06-18)) |

`notes` / `attachments` — deferred; opt-in per [cross-cutting table](#cross-cutting-fields-notes-attachments).

**Type-specific extra Fields (later waves):**

| Detail Surface | Extra Field | When |
|----------------|-------------|------|
| `customer_detail` | org hub: `subsidiaries`, `contacts`, `portfolio_tree`, `related_engagements`, `related_invoices` | party hub wave — [customer.md](./surface-specs/customer.md) |
| `vendor_detail` | org hub: `parent_vendor`, `subsidiaries`, `contacts`, `subsidiary_tree`, `related_purchase_orders` (no sites) | party hub wave — [vendor.md](./surface-specs/vendor.md) |
| `vendor_detail` | `vendor_pricing` | wave 3 — `vendor_part` child collection |
| `manufacturer_detail` | *(none — base lens only)* | wave 1 — [spec](./surface-specs/manufacturer.md) |
| `property_owner_detail` | org hub: `parent_property_owner`, `subsidiaries`, `contacts`, `subsidiary_tree`, `related_sites` | wave 1 — [property-owner.md](./surface-specs/property-owner.md) |
| `part_list` | *(no manufacturer filter v1)* | wave 3 — [part.md](./surface-specs/part.md); not on `manufacturer_detail` |
| `{role}_detail` | `addresses` | wave 2 — `party_address` + nested `address` — [`party-addresses.md`](./surface-specs/party-addresses.md) |
| `employee_detail` | `add_as_db_user` | Initiate **Add User** → `/users/new`; POST links `party_person` — [provision decision](./decisions/party.md#decision-provision-app-user-from-person-surface-2026-06-25) |
| `employee_detail` | HR scalars (`hire_date`, `job_title`, …) | HR + identity slice — [decision](./decisions/party.md#decision-employee_detail-scope--marker-now-hr-later-2026-06-17) |

**Surface actions (type lenses):** standard `read` / `write` / `delete` + **`add_role`** / **`remove_role`** (optional) — server adds/removes `party_role` row; does not patch lens-specific Fields on the wrong Surface.

### `customer_list` · `customer_detail`

| | |
|--|--|
| **Status** | list shipped; detail **target spec** [customer.md](./surface-specs/customer.md) (2026-06-18) |
| **Route** | `/customers`, `/customers/[id]` |
| **Anchor** | `party` — DAL filter `party_role = customer` |

**List columns:** `display_name`, `kind`.

**`customer_detail` Fields (person):** base `profile`, `phones`, `emails`; wave 2 + `addresses` ([`party-addresses.md`](./surface-specs/party-addresses.md)).

**`customer_detail` Fields (organization):** base + wave 2 `addresses` + org hub — `parent_customer`, `subsidiaries`, `contacts`, combined `portfolio_tree`, `related_engagements`, `related_invoices` ([spec](./surface-specs/customer.md)).

### `vendor_list` · `vendor_detail`

| | |
|--|--|
| **Status** | list shipped; detail **target spec** [vendor.md](./surface-specs/vendor.md) (2026-06-18) |
| **Route** | `/vendors`, `/vendors/[id]` |
| **Anchor** | `party` — filter `vendor` |

**List columns:** `display_name`, `kind`. **Search:** `display_name`, `legal_name`.

**`vendor_detail` Fields (person):** base `profile`, `phones`, `emails`; wave 2 + `addresses` ([`party-addresses.md`](./surface-specs/party-addresses.md)).

**`vendor_detail` Fields (organization):** base + wave 2 `addresses` + org hub — `parent_vendor`, `subsidiaries`, `contacts`, `subsidiary_tree`, `related_purchase_orders` ([spec](./surface-specs/vendor.md)). No sites, engagements, or invoices.

### `manufacturer_list` · `manufacturer_detail`

| | |
|--|--|
| **Status** | list shipped; detail **target spec** [manufacturer.md](./surface-specs/manufacturer.md) (2026-06-18) |
| **Route** | `/manufacturers`, `/manufacturers/[id]` |
| **Anchor** | `party` — filter `manufacturer` |

**List columns:** `display_name`, `kind`. **Search:** `display_name`, `legal_name`.

**`manufacturer_detail` Fields (person and organization):** base `profile`, `phones`, `emails`; wave 2 + `addresses` ([`party-addresses.md`](./surface-specs/party-addresses.md)) — no subsidiaries, contacts, related lists, or parts ([spec](./surface-specs/manufacturer.md)).

### `property_owner_list` · `property_owner_detail`

| | |
|--|--|
| **Status** | **target spec** [property-owner.md](./surface-specs/property-owner.md) (2026-06-18) |
| **Route** | `/property-owners`, `/property-owners/[id]` |
| **Anchor** | `party` — filter `property_owner` |

**List columns:** `display_name`, `kind`. **Search:** `display_name`, `legal_name`.

**`property_owner_detail` Fields (person):** base `profile`, `phones`, `emails`; wave 2 + `addresses` ([`party-addresses.md`](./surface-specs/party-addresses.md)).

**`property_owner_detail` Fields (organization):** base + wave 2 `addresses` + `parent_property_owner`, `subsidiaries`, `contacts`, `subsidiary_tree`, read-only `related_sites` via `site.property_owner_party_id` — no engagements / invoices ([spec](./surface-specs/property-owner.md)).

### `employee_list` · `employee_detail`

| | |
|--|--|
| **Status** | shipped (target spec [employee.md](./surface-specs/employee.md)) |
| **Wave** | 0 |
| **Route** | `/employees`, `/employees/[id]` |
| **Nav group** | Contacts |
| **Anchor** | `employee` (list: `party` + lens) |
| **Tables** | `employee`, `party`, `party_person` *(after refactor)* |

**`employee_list` columns:** `display_name`; deferred: `employment_status`, `default_labor_class`, login chip

**`employee_detail` Fields (wave 0):**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | Person name via `party_person` (`first_name`, `last_name`, `nick_name`, `display_name`, `avatar_url`) |
| `phones` | collection | `party_phone` |
| `emails` | collection | `party_email`; `is_login_email` sync |
| `staff` | scalar | `employee` row marker |
| `add_as_db_user` | action | Person surface initiates `/users/new`; creates `latch_users`, sets `party_person.latch_user_id`; optional `is_login_email` sync — [provision decision](./decisions/party.md#decision-provision-app-user-from-person-surface-2026-06-25) |

**Deferred Fields:** `default_labor_class` (costing slice); HR scalars `employment`, `job_title`, `department`, `reports_to`, `primary_site` — [spec](./surface-specs/employee.md), [decision](./decisions/party.md#decision-employee_detail-scope--marker-now-hr-later-2026-06-17).

---

## Wave 1 — Sites (draft)

### `site_list` · `site_detail`

| | |
|--|--|
| **Status** | **target spec** [site.md](./surface-specs/site.md) (2026-06-19) |
| **Wave** | 1 |
| **Route** | `/sites`, `/sites/[id]` |
| **Nav group** | Sites |
| **Anchor** | `site` |
| **Tables** | `site`, `site_contact`, `site_contact_relation` |

**`site_list` columns:** `name` only — **no** `parent_site_id` column in wave 1 ([decision](./decisions/site.md#decision-slice-2-ui-scope--planning-gate-2026-06-16))

**`site_detail` Fields (wave 1):**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | `name` |
| `customer_party` | scalar | `customer_party_id` → customer-tagged **org** — writable; [decision](./decisions/site.md#decision-portfolio-fks-on-site_detail--writable-scalars-2026-06-19) |
| `property_owner_party` | scalar | `property_owner_party_id` → property_owner-tagged party — writable |
| `contacts` | collection | `party_id`, `relation_id`, `sort_order` |

**`site_detail` Fields (wave 2b):** see [`surface-specs/site-geography.md`](./surface-specs/site-geography.md) — `parent_site`, `physical_address`, `sections`, `locations`.

**Notes:** Billing postal on `party_address`; dispatch on `physical_address`. Polymorphic `notes` on `site` deferred with shared notes pattern.

### `site_contact_relation_table`

| | |
|--|--|
| **Status** | **target spec** [site-contact-relation.md](./surface-specs/site-contact-relation.md) (2026-06-19) |
| **Wave** | 1 |
| **Route** | `/contact-relations` |
| **Nav group** | Sites |
| **Anchor** | `site_contact_relation` |

**Table columns:** `display_name`, `sort_order`

**Notes:** Catalog starts empty at migrate; progressive setup + dev seed [`020_site_contact_relation_dev_seed.sql`](../migrations/020_site_contact_relation_dev_seed.sql).

---

## Wave 2 — Party addresses

> **Implement spec:** [`surface-specs/party-addresses.md`](./surface-specs/party-addresses.md) (2026-06-19)

### `{role}_detail` — add `addresses`

Applies to **customer, vendor, manufacturer, property_owner** detail lenses — **person and org** layouts. **Not** `employee_detail`.

| Field | Type | Notes |
|-------|------|-------|
| `addresses` | collection | `party_address` + nested `address` row: `purpose`, `label`, `line1`, `line2`, `city`, `state`, `postal_code`, `country`, optional `lat`/`lng` |

**Purpose CHECK:** `billing`, `remit_to`, `hq`, `mailing`, `other`

**PATCH:** replace-array; shared `address` row → copy-on-write when postal fields change ([decision](./decisions/site.md#decision-shared-address-row--copy-on-write-on-patch-2026-06-19)).

---

## Wave 2b — Site geography

> **Implement spec:** [`surface-specs/site-geography.md`](./surface-specs/site-geography.md) (2026-06-19)

### `site_detail` — add geography Fields

| Field | Type | Notes |
|-------|------|-------|
| `parent_site` | scalar | `parent_site_id` — acyclic picker |
| `physical_address` | scalar | `site.physical_address_id` → `address` — dispatch/maps; copy-on-write when shared |
| `sections` | collection | `site_section` — `title`, `sort_order`, `status` |
| `locations` | collection | `site_location` — `label`, `site_section_id`, `sort_order`, `status`, `replaced_by_site_location_id` |

**PATCH:** replace-array for `sections` / `locations`; admin-created rows default **`active`**; line-referenced locations tombstone via status — [spec](./surface-specs/site-geography.md).

---

## Wave 3 — Catalog (draft)

### `part_list` · `part_detail` (`manufacturer_part`)

| | |
|--|--|
| **Status** | **target spec** [part.md](./surface-specs/part.md) (2026-06-19) |
| **Wave** | 3 |
| **Route** | `/parts`, `/parts/[id]` |
| **Nav group** | Catalog |
| **Anchor** | `manufacturer_part` |
| **Tables** | `manufacturer_part`, `vendor_part` |

**`part_list` columns:** `mpn`, `description`, `manufacturer` label — search `mpn` + `description`; sort manufacturer then `mpn`; no price columns; no manufacturer filter v1

**`part_detail` Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | `manufacturer_party_id`, `mpn`, `description`, `unit`, `purchase_unit`, `units_per_purchase` — defer `specs`, `cut_sheet_url` |
| `vendor_pricing` | collection | `vendor_part` — `vendor_party_id`, `vendor_pn`, `vendor_description`, `unit_price`, `is_preferred` (one preferred per part) |

### `item_list` · `item_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 3 |
| **Route** | `/items`, `/items/[id]` |
| **Nav group** | Catalog |
| **Anchor** | `item` |

**`item_list` columns:** `sku`, `name`, `category` label

**`item_detail` Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | `sku`, `name`, `description`, `category_id`, sell defaults |
| `part_links` | collection | `item_part_link` — `part_id`, `link_kind` (`alternate` \| `component`), qty |

### `category_table` · `labor_class_table` · `phase_table`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 3 |
| **Route** | `/catalog/categories`, `/catalog/labor-classes`, `/catalog/phases` |
| **Nav group** | Catalog |

**`category_table` columns:** `name`, `parent_id`, `csi_code`, `sort_order`

**`labor_class_table` columns:** `name`, `sort_order` *(rates table deferred)*

**`phase_table` columns:** `name`, `sort_order` — labor/reporting phases on estimate/job lines and `job_work_item` ([`current.dbml`](./schema/current.dbml)); progressive setup + catalog table page. *Added to catalog during task 19 scan.*

---

## Wave 4 — Estimates (draft)

### `job_party_relation_table`

| | |
|--|--|
| **Status** | shipped (wave 4a) |
| **Wave** | 4 |
| **Route** | `/party-relations` |
| **API** | `/api/estimates/party-relations` |
| **Nav group** | Sales |
| **Nav label** | Party relations |
| **Anchor** | `job_party_relation` |
| **Spec** | [`surface-specs/job-party-relation.md`](./surface-specs/job-party-relation.md) |

**Table columns:** `display_name`, `sort_order`

### `estimate_list` · `estimate_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 4 |
| **Route** | `/estimates`, `/estimates/[id]` |
| **Nav group** | Sales |
| **Anchor** | `estimate` |
| **Tables** | `estimate`, `estimate_section`, `estimate_line`, `estimate_party` |

**Prerequisite:** `site_id` on estimate → site's `site_section` / `site_location` registry ([`site_detail`](#site_list--site_detail)). Grouping by place uses site-owned rows only ([decision](./decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17).

**`estimate_list` columns:** `title`, `site` name, `status`, `estimate_date`

**`estimate_detail` Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | `title`, `site_id`, `status`, `estimate_date`, `valid_until`, `source_estimate_id`, optional `category_id` |
| `stakeholders` | collection | `estimate_party` — `party_id`, `relation_id` |
| `quote_sections` | collection | `estimate_section` — commercial / CSI buckets (`title`, `category_id`, `sort_order`) — optional; not site geography |
| `line_items` | collection | `estimate_line` — see below |

**`line_items` editor (O3):**

| Mode | When | UI |
|------|------|-----|
| **Flat (A)** | No grouping by site section/location | Single `line_items` field array |
| **Grouped (B)** | Lines organized by site **section** and/or **location** | Nested/grouped view over same `line_items` DTO; each line has `site_location_id`; may create `proposed` locations on quote site |

**Line element:** `line_number`, `line_role`, `line_kind`, `description`, `quantity`, `unit`, `unit_cost`, `unit_price`, `estimate_section_id`, `site_location_id`, `phase_id`, `item_id`, `part_id`, `vendor_part_id`, `parent_line_id`, `sort_order`

**Surface actions:** + `win` / `lose` — DAL creates job on win with line snapshots

**Notes:** Kits via `parent_line_id` + `line_role`. Physical place = `site_location_id` only.

---

## Wave 5 — Jobs & change orders (draft)

### `job_list` · `job_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 5 |
| **Anchor** | `job` |
| **Route** | `/jobs`, `/jobs/[id]` |
| **Nav group** | Operations |
| **Tables** | `job`, `job_party`, `job_line`, `job_line_part`, `job_work_item` |

**Layout (O4):** Tabbed UI on one Surface — [decision](./decisions/job.md#decision-job_detail-layout--tabbed-2026-06-17).

| Tab | Content |
|-----|---------|
| **Overview** | `profile`, `stakeholders`, `billing_settings` |
| **Scope** | `line_items`; links to change orders + procurement Surfaces |
| **Field** | `work_items` |
| **Billing** | `billable_items`, `sov_milestones` (wave 6b); links to invoices |

**`job_list` columns:** `title`, `site` name, `status`, `job_kind`

**`job_detail` Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | `title`, `site_id`, `estimate_id`, `parent_job_id`, `job_kind`, `status` |
| `billing_settings` | scalar group | `billing_model`, `billing_basis`, `bill_on_work_status`, `retainage_pct` |
| `stakeholders` | collection | `job_party` |
| `line_items` | collection | `job_line` — sold scope; **same flat vs site-geography grouping** as estimate ([decision](./decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17)) |
| `work_items` | collection | `job_work_item` — field status per line × location × phase |
| `billable_items` | collection | `billable_line` — **wave 6b**; shown when billing section granted |
| `sov_milestones` | collection | `schedule_of_value` + `sov_line` + `sov_allocation` — when `billing_model = progress_sov` ([decision](./decisions/billing.md#decision-sov-ui--nested-on-job_detail-billing-tab-2026-06-17)) |

**`job_line` element (high level):** same shape as estimate line + `source`, `status`, `estimate_line_id`, `change_order_line_id`, engineering via nested `job_line_part` in DAL

**Surface actions:** + `complete` (publishes site geography), link to procurement/billing workbenches

### `change_order_list` · `change_order_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 5 |
| **Route** | `/jobs/[jobId]/change-orders`, `…/[id]` |
| **Anchor** | `change_order` |

**`change_order_detail` Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | `title`, `status`, `job_id`, dates |
| `line_items` | collection | `change_order_line` — deltas to `job_line` |

---

## Wave 6a — Procurement (draft)

### `requested_order_list` · `requested_order_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 6a |
| **Route** | `/requisitions`, `/requisitions/[id]` |
| **Nav group** | Procurement |
| **Anchor** | `requested_order` |

**`requested_order_detail` Fields:** `profile` (`job_id`, `status`, …), `line_items` (`requested_order_line` — links `job_line_part_id` or ad-hoc part)

### `purchase_order_list` · `purchase_order_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 6a |
| **Route** | `/purchase-orders`, `/purchase-orders/[id]` |
| **Anchor** | `purchase_order` |

**`purchase_order_detail` Fields:** `profile` (vendor, job, status), `line_items` (`purchase_order_line`), shipments nested per line (`purchase_order_line_shipment`)

**Notes:** PO creation picks open requisition lines; one draft PO per vendor per batch ([decision](./decisions/README.md)).

### `material_receipt_list` · `material_receipt_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 6a |
| **Route** | `/receipts`, `/receipts/[id]` |
| **Anchor** | `material_receipt` |

**`material_receipt_detail` Fields:** `profile`, `line_items` (`material_receipt_line`)

---

## Wave 6b — Billing (draft)

### `invoice_list` · `invoice_detail`

| | |
|--|--|
| **Status** | draft |
| **Wave** | 6b |
| **Route** | `/invoices`, `/invoices/[id]` |
| **Nav group** | Accounting |
| **Anchor** | `invoice` |

**`invoice_list` columns:** `invoice_number`, `job` title, `billing_kind`, `status`, `net_due`

**`invoice_detail` Fields:**

| Field | Type | Notes |
|-------|------|-------|
| `profile` | scalar | `job_id`, `invoice_number`, `billing_kind`, `status`, dates, header totals (snapshot at issue) |
| `line_items` | collection | `invoice_line` — pickup from `billable_line` or manual |

**Surface actions:** `issue`, `void`, `mark_paid` — DAL transitions

**Notes:** `billable_items` and `sov_milestones` stay on `job_detail` Billing tab; no standalone `billable_line` or SOV Surfaces ([billing](./decisions/billing.md#decision-billing--earned-staging-progress-sov-retainage-2026-06-17), [SOV UI](./decisions/billing.md#decision-sov-ui--nested-on-job_detail-billing-tab-2026-06-17)).

---

## Wave 7 — Reports

| | |
|--|--|
| **Status** | draft |
| **Wave** | 7 |
| **Route** | `/reports/job-progress` *(example)* |
| **Nav group** | Reports |

Custom SQL / read-only pages — **not** Latch Surfaces initially. May later promote high-value views to read-only Surfaces.

---

## Nav groups (target)

| Group | Surfaces |
|-------|----------|
| IAM | `user_*`, `role_*` |
| Contacts | `customer_*`, `vendor_*`, `manufacturer_*`, `property_owner_*`, `employee_*` |
| Sites | `site_*`, `site_contact_relation_table` |
| Catalog | `part_*`, `item_*`, `category_table`, `labor_class_table` |
| Sales | `estimate_*`, `job_party_relation_table` |
| Operations | `job_*`, `change_order_*` |
| Procurement | `requested_order_*`, `purchase_order_*`, `material_receipt_*` |
| Accounting | `invoice_*` |
| Reports | custom pages |

Omit empty groups server-side ([decision](./decisions/general.md#decision-sidebar-grouping--chrome-flat-surfaces-in-menu-groups-2026-06-13)).

---

## Related docs

- [architecture.md](./architecture.md) — entity flow + headline surface table
- [child-collections.md](./child-collections.md) — patch/replace pattern
- [routing-and-libraries.md](./routing-and-libraries.md) — explicit routes
- [tasks/deferred/site-migration.md](./tasks/deferred/site-migration.md) — wave 1 DDL spec (paused)
- [tasks/18-surface-catalog.md](./tasks/18-surface-catalog.md) — complete this catalog
