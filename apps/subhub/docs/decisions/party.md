# SubHub decisions — party

> Party spine, roles, type lens Surfaces, profile Fields, identity, and employee.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: party spine for contacts (2026-06-12)

**Choice:** One `party` table (`kind`: `person` \| `organization`) with `party_role` tags (`customer`, `vendor`, `manufacturer`, `employee`). Subset list Surfaces filter by role; one `contact_detail` Surface for CRUD *(detail/list nav shape [deferred](#decision-party-listdetail-surface-shape--deferred-2026-06-16) — may become unified party + role filters)*.

**Amended (2026-06-15):** Master role enum expanded and split from job-scoped relations — see [party_role master tags vs job-scoped relations](#decision-party_role-master-tags-vs-job-scoped-relations-2026-06-15).

**Amended (2026-06-16):** Kind-specific columns live in 1:1 extensions `party_person` / `party_organization` (not on `party`). `employee.party_id` FK targets `party_person` — staff are always persons; `party_role` tag `employee` for master list filtering. Login via [`party_person.latch_user_id`](#decision-party-identity--party_person-login-link-2026-06-18). See [`schema/current.dbml`](../schema/current.dbml).

**Amended (2026-06-18):** Supersedes interim `employee.latch_user_id` and draft `party_user` — see [party identity](#decision-party-identity--party_person-login-link-2026-06-18).

**Rationale:** Avoids duplicate CRUD across Customer/Vendor/Manufacturer tables; matches “subset of contacts” language.


### Decision: party_role master tags vs job-scoped relations (2026-06-15)

**Choice:** Two layers — do not overload `party_role` with job context.

| Layer | Table | Purpose |
|-------|-------|---------|
| **Master tags** | `party_role` | Address-book classification; drives filtered list Surfaces; **not** an editable multi-select on type detail Surfaces — see [party list/detail](#decision-party-listdetail-surface-shape-2026-06-16-locked-2026-06-17) |
| **Job stakeholders** | `job_party` *(job slice)* | Per-job counterparty graph: customer, owner, bill-to, GC, sub chain, etc. |

**Master `party_role` enum (v1):** `customer`, `vendor`, `manufacturer`, `employee`, `property_owner`, `other`.

- **Not** master tags: `general_contractor`, `subcontractor` — express these on `job_party` (the GC may *also* be tagged `customer` in the address book).
- **`employee`** remains a master tag for internal staff; staff HR fields on `employee` table — [deferred columns](#decision-employee-hr-fields-deferred-2026-06-16). Login via [`party_person.latch_user_id`](#decision-party-identity--party_person-login-link-2026-06-18) (provision from person Surfaces, not IAM user Surface).

**Rationale:** Same site can host jobs with different customer/owner graphs (e.g. GC on one job, building owner direct on another). Master tags answer “who is this party to us generally?”; job relations answer “who plays which part on *this* engagement?”

**Service vendors (parts vs labor):** Master tag `vendor` covers **parts** supply (`vendor_part`, `purchase_order`). **Labor / subcontract scope** is not a standing vendor catalog — express on `job_party` with relation `subcontractor` (from `job_party_relation`) and scoped work on `estimate_line` / `job_line`. Equipment **rental** may be an `expense` catalog item. Same `party` may be tagged `vendor` in the address book and appear as `subcontractor` on a specific quote/job.


### Decision: party list/detail Surface shape (2026-06-16, **locked 2026-06-17**)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O1).

**Locked (data model):** One `party` anchor; `party_role` master tags; no separate manufacturer/vendor tables. See [party spine](#decision-party-spine-for-contacts-2026-06-12).

**Locked (UI — O1a):** **Role subset lists** — one `{role}_list` Surface per meaningful master tag. DAL filters `party_role` by `surfaceId`. No unified address-book list as the primary nav pattern.

**Locked (UI — O1b):** **Matched list → detail** — each role list opens its own detail Surface (`customer_list` → `customer_detail`, …). Grants are per explicit `surface_id` (no wildcard); a role that edits customers needs both `customer_list` and `customer_detail`.

**Amended (2026-06-17 — lens model):**

- **Detail Surfaces are lenses**, not partitions — same `party.id` on `/customers/[id]` and `/vendors/[id]` when the party has multiple tags; base Fields (profile, phones, emails) edit shared rows; lens-specific Fields (e.g. `vendor_pricing`) only on that Surface.
- **Drop `contact_list` / `contact_detail` / `/contacts`** from v1 nav and routes. No morphing layout by role. Slice 1 shipped `/contacts` is retired in wave 1 when type pairs land.
- **No `roles` multi-select** on type detail forms. On create via `{role}_detail`, DAL auto-applies that tag. **Add/remove tag** = explicit actions (e.g. “Add as vendor” → insert `party_role` → navigate to `vendor_detail`); validate lens-specific Fields only on that Surface’s save.
- **Multi-tag display:** read-only chips on detail (“Also: Vendor”) linking to the other lens URL — not inline role editing.

**Party Surface pairs (v1):**

| Master tag | List Surface | Detail Surface | Route prefix |
|------------|--------------|----------------|--------------|
| `customer` | `customer_list` | `customer_detail` | `/customers` |
| `vendor` | `vendor_list` | `vendor_detail` | `/vendors` |
| `manufacturer` | `manufacturer_list` | `manufacturer_detail` | `/manufacturers` |
| `property_owner` | `property_owner_list` | `property_owner_detail` | `/property-owners` |
| `employee` | `employee_list` | `employee_detail` | `/employees` |

**No** `contact_list`, `contact_detail`, or `other_list`. Tag `other` — parties appear via pickers / future global search only.

**Shared implementation (not shared Surfaces):** Policy boundaries stay separate per Surface; **code** is shared where UX is identical:

| Layer | Share |
|-------|--------|
| **UI** | One `PartyDetailForm` (and list shell) parameterized by `surfaceId` + manifest; lens chips + add-role actions |
| **DAL** | Shared `lib/contacts/repository.ts` helpers; per-Surface descriptor factory from role tag |
| **API** | Explicit routes per type (`/api/customers/[id]`, …); handlers call shared factory |
| **YAML** | One `*.surface.yaml` per Surface (grants differ); common Field ids (`profile`, `phones`, `emails`) on party lenses |

Type-specific **extra Fields** (e.g. `vendor_pricing` on `vendor_detail` in catalog wave) extend the base shape — do not fork the whole form.

**Retired (Slice 1 interim):** `contact_list`, `contact_detail`, `/contacts` — remove from nav, routes, and registry when wave 1 type pairs ship ([`surfaces.md`](../surfaces.md#party-surface-pairs)).

**Not in scope:** Job-scoped `subcontractor` — stays on `job_party`, not master `party_role`.

**Catalog:** [`surfaces.md`](../surfaces.md#party-surface-pairs).


### Decision: party profile Fields on type lenses (2026-06-17)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O2 — names).

**Choice:** Kind-specific **profile** scalar on all `{role}_detail` party lenses (and person fields on `employee_detail` via `party_person`):

| `party.kind` | Writable on profile | DAL-maintained |
|--------------|---------------------|----------------|
| `person` | `first_name`, `last_name` (`party_person`) | `party.display_name` ← concat for list sort |
| `organization` | `legal_name` (`party`), `dba_name` (`party_organization`, optional) | `party.display_name` ← `legal_name` or `dba_name` |

`party.kind` is set at create, immutable after. **Do not** use a single editable `display_name` as the primary person/org form field.

**Notes UI:** **Deferred** — see [notes and attachments](./cross-cutting.md#decision-notes-and-attachments--shared-tables-deferred-2026-06-15) (amended 2026-06-17). Wave 1 migration may backfill `party.notes` → `note` rows in DDL; no `notes` Field on party lenses until the cross-cutting notes slice.


### Decision: party identity — `party_user` + `user_class` (deferred) (2026-06-15) — **superseded**

**Superseded by** [party identity — `party_person` login link (2026-06-18)](#decision-party-identity--party_person-login-link-2026-06-18).

<details>
<summary>Original choice (archived)</summary>

**Choice:** **Deferred** — hold DDL until we have a clearer picture of **who** may log in (staff only vs customers, GCs, site contacts, etc.). Document now in [`schema/current.dbml`](../schema/current.dbml); do **not** implement in Slice 2.

| Piece | Intent |
|-------|--------|
| `party_user` | Person ↔ `latch_users` bridge for **any** SubHub login (not only staff). FK → `party_person` (persons only — orgs do not log in). Opt-in: most contacts never get a row. |
| `party_user` profile | Session-facing fields on the link row: `display_name` (shell override, fallback `party.display_name`), `avatar_url` (URL until polymorphic `attachment` lands). Credentials stay on `latch_users`; structured name on `party_person`. |
| `latch_users.user_class` | `internal` \| `external` — separates staff auth plane from customer/partner portal principals |
| Portal app roles + row scope | External users see only data tied to their party / `job_party` rows |

**Interim (shipped):** staff login via `employee.latch_user_id`; migrate to `party_user` when the identity slice lands. Customer portal and external row scope remain out of scope until then.

</details>


### Decision: party identity — `party_person` login link (2026-06-18)

**Status:** Locked in DBML + surface specs. **Implementation deferred** — shipped Postgres/UI still interim (`login_email`, `employee.latch_user_id`) until identity wave after task 19.

**Choice:** Two-table identity — platform auth + business person — with profile and link on `party_person`. **No `party_user` table.**

| Piece | Table / Surface | Intent |
|-------|-----------------|--------|
| Auth principal | `latch_users` | `login_name`, `password_hash`, optional `login_email` (unique copy — app syncs from `party_email`) |
| Person + session chrome | `party_person` | `first_name`, `last_name`, `nick_name`, `display_name`, `avatar_url` |
| Login link | `party_person.latch_user_id` | Nullable unique FK → `latch_users`. Any person (not only `employee`) may have a login. |
| Staff HR | `employee` | HR extension only — **no** `latch_user_id` |
| Permissions | `latch_user_roles` | Unchanged — keyed by `latch_users.id` |
| IAM admin Surface | `user_list` / `user_roles_detail` | **Anchor `party_person`**; lens `latch_user_id IS NOT NULL`. Read + role/password actions — **not** create/delete users |
| Provision login | `employee_detail`, `{role}_detail` (person) | **`add_as_db_user`** action: create `latch_users`, set link, designate login `party_email` (`is_login_email`) and sync → `login_email` |
| Bootstrap master | `/setup` | May create `latch_users` without `party_person` until linked |

**Email as login (separation of concerns):**

- **Latch** owns `latch_users.login_email` — nullable, **UNIQUE** — used only for sign-in (`resolveLatchUserId` queries `latch_users` only; no FK to business tables).
- **App** owns `party_email` collection and which row is login (`is_login_email` on `party_email`; at most one per linked person in v1).
- On **`add_as_db_user`** or when saving emails on a linked person: app copies designated `party_email.address` → `latch_users.login_email` in the same transaction. If `login_email` would duplicate an existing principal, reject (platform UNIQUE + app pre-check).
- On **patch** to the login `party_email` row: app syncs `address` → `latch_users.login_email` in the same transaction.
- IAM may provision **without** email (`login_email` null); login email chosen later on person Surface.
- **No** global `party_email.address` UNIQUE — duplicate contact emails across parties are allowed until promoted to login.

**Termination:** HR marks employee terminated (future `employment_status`); IAM **suspends or changes roles** — do not delete `latch_users` when historical/payroll access may still be required. **Unlink login** is a separate rare action.

**Still deferred:** `latch_users.user_class`, portal row scope, customer/GC portal audience — orthogonal to this shape.

**Rationale:** Platform stays free of business-table FKs. Login uniqueness is enforced where Latch owns credentials (`login_email` UNIQUE). App owns email UX and sync discipline.


### Decision: `party_email.address` unique — login safety (2026-06-18) — **superseded**

**Superseded by** [login email sync](#decision-login-email--app-sync-to-latch_userslogin_email-2026-06-18) (2026-06-18 amendment). Global `party_email.address` UNIQUE is **not** required when login uniqueness lives on `latch_users.login_email`.


### Decision: login email — app sync to `latch_users.login_email` (2026-06-18)

**Choice:** **Latch** stores `latch_users.login_email` (nullable, UNIQUE). **App** designates login via `party_email.is_login_email` and **copies** `address` → `login_email` on provision and when the login row is edited.

| Layer | Responsibility |
|-------|----------------|
| Platform migration | `latch_users.login_email TEXT UNIQUE` (shipped in `001`) |
| Platform sign-in | `resolveLatchUserId` — `login_name` OR `login_email` on `latch_users` only |
| App DDL | `party_email.is_login_email` (identity wave); no UNIQUE on `address` required for login |
| App DAL | Set/clear `is_login_email`; sync copy to `latch_users.login_email`; same-transaction on email patch |

**Rationale:** Clear separation — Latch owns credential strings and UNIQUE; app owns how email is chosen and kept in sync. Avoids `email_id` FK from platform into business schema. Second party cannot claim the same login email because `latch_users.login_email` UNIQUE blocks the copy even if `party_email.address` duplicates exist as contact data.


### Decision: employee HR fields (deferred) (2026-06-16)

**Choice:** `employee` is a **staff-only** extension row (FK → `party_person`, `party_role` tag `employee`). **Do not add HR columns to DDL yet.** Document planned fields in [`schema/current.dbml`](../schema/current.dbml) `Note` on `employee`:

| Planned column | Purpose |
|----------------|---------|
| `hire_date`, `termination_date` | Employment lifecycle |
| `employee_number` | Payroll / badge id |
| `job_title` | Business title (≠ Latch IAM role) |
| `department` or `primary_scope_id` | Org structure / branch |
| `reports_to` | FK → `employee` — management chain |
| `employment_status` | e.g. active, on_leave, terminated |
| `primary_site_id` | Home office / default dispatch (Slice 2+ `site`) |

**Not on `employee`:** name (`party_person`), list display (`party`), phones/emails (`party_phone` / `party_email`), login (`party_person.latch_user_id`), permissions (`latch_user_roles`).

**Rationale:** Slice 1 needs a staff marker and surfaces, not a full HR module. Lock the field list now so HR columns do not absorb login or permissions.


### Decision: `employee_detail` scope — marker now, HR later (2026-06-17)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O7).

**Choice:** Two-wave sequence (option C):

| Phase | `employee_detail` Fields | DDL |
|-------|--------------------------|-----|
| **Through wave 1+** | `profile` (via `party_person`), `staff` marker, **`add_as_db_user`** (provision login — see [party identity](#decision-party-identity--party_person-login-link-2026-06-18)) | No HR columns — see [employee HR fields](#decision-employee-hr-fields-deferred-2026-06-16) |
| **HR slice** | Add planned HR scalar Fields (`hire_date`, `employee_number`, `job_title`, …) | HR columns migration |

**Amended (2026-06-18):** Retired `account_link` / `employee.latch_user_id` Field — login provision via `add_as_db_user` on `party_person`.

**Rationale:** Wave 1 party refactor and site slice do not need HR scope. Catalog documents the future Field list without blocking implementation. Name, phones, emails stay on party collections; IAM permissions stay on platform tables.


### Decision: org subsidiaries — separate tagged parties (Model A) (2026-06-18)

**Status:** Locked in [`customer.md`](../surface-specs/customer.md) discussion. **DDL deferred** until party hub migration after task 19.

**Choice:** Corporate **subsidiaries / branches** are **separate `party` rows**, each with their own master tag (`customer`, `vendor`, …) — not nested rows under one anchor party.

| Piece | Rule |
|-------|------|
| **Structure** | `party_organization.parent_party_id` nullable FK → `party.id` (parent must be `kind = organization`) |
| **Tags** | Each subsidiary gets its own `party_role` row (e.g. `customer`) — bills and jobs can target the subsidiary party |
| **Person customers** | **No** subsidiaries — DAL rejects `parent_party_id` when `kind = person` |
| **Cycles** | DAL rejects `parent_party_id` chains that loop |
| **Create** | Optional **`parent_customer`** (or `parent_party_id`) on org create — separate field, not inferred from tree selection alone |
| **Lenses** | **`customer_detail`**, **`vendor_detail`**, **`property_owner_detail`** (wave 1 hub) — Model A branches; vendor omits sites ([vendor hub](#decision-vendor-hub--subsidiaries-contacts-and-pos-2026-06-18)); property owner links sites via `site.property_owner_party_id` ([property owner hub](#decision-property-owner-hub--subsidiaries-contacts-and-sites-2026-06-18)). **`manufacturer_detail`** excluded — flat org, no `parent_party_id` ([manufacturer hub](#decision-manufacturer-hub--base-lens-only-2026-06-18)) |

**Surface Fields (org lenses only):** `subsidiaries` collection (child org parties: `id`, `display_name`, link to lens URL); actions **`add_subsidiary`**, **`attach_subsidiary`** (existing org + set parent).

**Rationale:** Construction and vendor supply chains treat branches as distinct billing / job counterparties while sharing a corporate tree. Model B (structure-only children without tags) would force all jobs onto the parent party id and breaks subsidiary AR/AP.


### Decision: org contacts — `party_contact` junction (2026-06-18)

**Status:** Locked in [`customer.md`](../surface-specs/customer.md). **DDL deferred** until party hub migration.

**Choice:** Organization lenses expose a **`contacts`** collection — links to **existing person `party` rows**, not nested `party_person` under the org.

| Piece | Table / catalog |
|-------|-----------------|
| Junction | `party_contact` — `organization_party_id`, `contact_party_id` (person), `relation_id`, optional `title`, `sort_order` |
| Catalog | `party_contact_relation_table` — AP, billing, superintendent, … (progressive setup + catalog page) |
| **Quick create** | **`add_contact`** action: create person `party` + `party_person` + attach row in one transaction (minimal name + optional phone/email) |
| **Person lenses** | **Omit** `contacts` — the person **is** the contact |
| **vs `site_contact`** | `site_contact` = standing roles **at a property**; `party_contact` = **org-level** roster (HQ, AP) with no site required |

**Lenses (v1):** `customer_detail`, `vendor_detail`, `property_owner_detail` — shared `contacts` shape; customer adds engagements/invoices ([customer hub](#decision-customer-hub--portal-tree-and-related-lists-2026-06-18)); vendor adds POs ([vendor hub](#decision-vendor-hub--subsidiaries-contacts-and-pos-2026-06-18)); property owner adds `related_sites` ([property owner hub](#decision-property-owner-hub--subsidiaries-contacts-and-sites-2026-06-18)). **`manufacturer_detail`** omits contacts ([manufacturer hub](#decision-manufacturer-hub--base-lens-only-2026-06-18)).

**Rationale:** Reuses the party spine (one person = one `party`); same person may appear on org `party_contact` and on `site_contact` at different sites. Quick-create avoids forcing a detour through a separate create flow for every AP clerk.


### Decision: customer hub — portal tree and related lists (2026-06-18)

**Status:** Locked in [`customer.md`](../surface-specs/customer.md). **Vendor hub differs** — [vendor hub decision](#decision-vendor-hub--subsidiaries-contacts-and-pos-2026-06-18).

**Choice:**

| UI | Rule |
|----|------|
| **Combined tree** | One Ant `Tree` on org **`customer_detail`**: **subsidiary org nodes** (`party_organization.parent_party_id`) then **site nodes** under the party that owns them (`site.customer_party_id` — [site decision](./site.md#decision-site-customer_party_id--explicit-portfolio-link-2026-06-18)) |
| **Drill-down** | Select tree node → right pane: subsidiary **profile** or **site** summary; child lists **estimates / jobs / service** for that site (links to canonical Surfaces — navigation only v1) |
| **Create from hub** | Toolbar / tree context: **add subsidiary**, **add site** (sets `customer_party_id` to selected org node) |
| **Related invoices** | Read-only **`related_invoices`** on org hub — traverse `job_party` (customer) → `job` → `invoice`; omit rows when principal lacks `read` on `invoice_detail` |
| **Cross-Surface UX** | **Navigation only** in v1 — no drawer/modal portaling of full foreign Surfaces ([general](./general.md#decision-cross-surface-related-records--navigation-only-v1-2026-06-18)) |
| **Person layout** | **No** tree, subsidiaries, or org contacts — profile + phones + emails only |

**Job / estimate entry (downstream):** picker order **sub-customer (optional) → site → engagement**; sub-customer defaults from `site.customer_party_id` or explicit subsidiary selection.

**Rationale:** Operators think in portfolio → property → job; combined tree matches that without merging org hierarchy and `site.parent_site_id` geography into one ambiguous parent FK.


### Decision: vendor hub — subsidiaries, contacts, and POs (2026-06-18)

**Status:** Locked in [`vendor.md`](../surface-specs/vendor.md).

**Choice:**

| UI | Rule |
|----|------|
| **No sites** | Vendor hub does **not** create, own, or list `site` rows — supply vendors are not portfolio property owners |
| **Org tree** | **`subsidiary_tree`** — org nodes only (sub-vendor branches via `party_organization.parent_party_id`) |
| **Parent** | Read-only **`parent_vendor`** when `parent_party_id` set — link to parent vendor org |
| **Contacts** | Same **`contacts`** + **`add_contact`** as customer org hub |
| **Related POs** | Read-only **`related_purchase_orders`** — `purchase_order.vendor_party_id` in anchor subtree; omit when no `purchase_order_detail` `read` |
| **Omit** | No `related_engagements`, `related_invoices`, `add_site`, `portfolio_tree` |
| **Person layout** | Profile + phones + emails only |

**Delete blockers:** open **`purchase_order`** rows referencing party; **sub-vendor** child orgs with `parent_party_id` → this party ([cross-cutting](./cross-cutting.md#decision-delete-blocked-by-referential-use--structured-errors-2026-06-18)).

**Rationale:** Parts vendors are ordered against via POs, not property portfolios. Corporate branches (regional supply houses) still need Model A subsidiaries and AP/sales contacts without forcing site semantics onto vendors.


### Decision: parent org Field — `parent_customer` / `parent_vendor` (2026-06-18)

**Status:** Locked in [`customer.md`](../surface-specs/customer.md) / [`vendor.md`](../surface-specs/vendor.md) / [`property-owner.md`](../surface-specs/property-owner.md).

**Choice:** **Lens-specific Field ids** mapping to one DDL column (`party_organization.parent_party_id`):

| Surface | Field id | Create picker filters |
|---------|----------|------------------------|
| `customer_detail` | `parent_customer` | customer-tagged orgs |
| `vendor_detail` | `parent_vendor` | vendor-tagged orgs |
| `property_owner_detail` | `parent_property_owner` | property_owner-tagged orgs |

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| **`parent_customer` / `parent_vendor` (chosen)** | Symmetric manifests; grant per lens; picker scope obvious in YAML and UI labels | Two Field ids for one column — shared DAL maps both |
| **`parent_party` shared id** | One Field id in codegen | Ambiguous grants; picker must infer lens from `surfaceId`; worse policy docs |
| **`parent_organization` generic** | Neutral naming | Hides business meaning in Contacts nav |

**Rationale:** Surface-scoped permissions and UX labels should say “parent customer” vs “parent vendor” vs “parent property owner” even though the FK is shared. DAL normalizes all to `parent_party_id` on write.


### Decision: manufacturer hub — base lens only (2026-06-18)

**Status:** Locked in [`manufacturer.md`](../surface-specs/manufacturer.md).

**Choice:**

| UI | Rule |
|----|------|
| **Fields** | Base party lens only — `profile`, `phones`, `emails` ([profile decision](#decision-party-profile-fields-on-type-lenses-2026-06-17)) |
| **Org profile** | `party.legal_name`, `party_organization.dba_name` — no other org hub Fields |
| **No hierarchy** | **No** sub-manufacturers — `party_organization.parent_party_id` must stay null; DAL rejects parent on create/patch |
| **No org contacts** | **Omit** `contacts` / `add_contact` — not manufacturer scope |
| **No related lists** | **No** `related_parts`, POs, or other downstream aggregates on `manufacturer_detail` |
| **Parts / MPNs** | Catalog on **`part_list` / `part_detail`** (wave 3); manufacturer Surface is picker anchor only |

**Delete blockers:** `manufacturer_part.manufacturer_party_id` → party (**`RESTRICT`**) — structured `ConflictError` with MPN summary ([cross-cutting](./cross-cutting.md)).

**Contrast:** [`customer.md`](../surface-specs/customer.md) (portfolio tree + related lists), [`vendor.md`](../surface-specs/vendor.md) (subsidiaries + contacts + POs).

**Rationale:** Manufacturers are referenced from the parts catalog; operators do not need a corporate hub or inline MPN list on the address-book lens. Flat org rows keep pickers simple.


### Decision: property owner hub — subsidiaries, contacts, and sites (2026-06-18)

**Status:** Locked in [`property-owner.md`](../surface-specs/property-owner.md). **DDL deferred** until site migration wave (`site.property_owner_party_id`).

**Choice:**

| UI | Rule |
|----|------|
| **Base lens** | `profile`, `phones`, `emails` on person and org — same as other party lenses |
| **Org tree** | **`subsidiary_tree`** — org nodes only (Model A via `party_organization.parent_party_id`) |
| **Parent** | **`parent_property_owner`** on create / read — link to parent property-owner org |
| **Contacts** | Same **`contacts`** + **`add_contact`** as customer/vendor org hubs |
| **Related sites** | Read-only **`related_sites`** — `site.property_owner_party_id` in anchor subtree ([site decision](./site.md#decision-siteproperty_owner_party_id--portfolio-link-2026-06-18)) |
| **Create from hub** | **`add_site`** sets `property_owner_party_id` to selected org node; does **not** set `customer_party_id` |
| **Omit** | No `related_engagements`, `related_invoices`, `portfolio_tree` (customer hub), POs (vendor hub) |
| **Person layout** | Profile + phones + emails only |
| **Delete** | No catalog RESTRICT blocker; sub-owner child orgs block; owned sites **unlink** (`property_owner_party_id` → null) |

**Three “property owner” layers** (document in spec — do not conflate):

| Layer | Mechanism |
|-------|-----------|
| Master tag | `party_role.property_owner` → `/property-owners` |
| Standing at site | `site_contact` + `site_contact_relation` label — does **not** auto-set master tag |
| Per job | `job_party` + `job_party_relation` label — does **not** auto-set master tag |

**Customer overlap:** dual tag (`customer` + `property_owner`) is normal; customer hub remains canonical for `customer_party_id`, engagements, and invoices.

**Rationale:** Legal property owners need org roster + subsidiary structure + owned-site portfolio without duplicating the customer engagement hub. Explicit `property_owner_party_id` parallels `customer_party_id` when payer ≠ owner.
