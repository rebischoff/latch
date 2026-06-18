# SubHub decisions — party

> Party spine, roles, type lens Surfaces, profile Fields, identity, and employee.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: party spine for contacts (2026-06-12)

**Choice:** One `party` table (`kind`: `person` \| `organization`) with `party_role` tags (`customer`, `vendor`, `manufacturer`, `employee`). Subset list Surfaces filter by role; one `contact_detail` Surface for CRUD *(detail/list nav shape [deferred](#decision-party-listdetail-surface-shape--deferred-2026-06-16) — may become unified party + role filters)*.

**Amended (2026-06-15):** Master role enum expanded and split from job-scoped relations — see [party_role master tags vs job-scoped relations](#decision-party_role-master-tags-vs-job-scoped-relations-2026-06-15).

**Amended (2026-06-16):** Kind-specific columns live in 1:1 extensions `party_person` / `party_organization` (not on `party`). `employee.party_id` FK targets `party_person` — staff are always persons; `party_role` tag `employee` for master list filtering. Interim staff login via `employee.latch_user_id` until [party identity slice](#decision-party-identity--party_user--user_class-deferred-2026-06-15) lands (`party_user`). See [`schema/current.dbml`](../schema/current.dbml).

**Rationale:** Avoids duplicate CRUD across Customer/Vendor/Manufacturer tables; matches “subset of contacts” language.


### Decision: party_role master tags vs job-scoped relations (2026-06-15)

**Choice:** Two layers — do not overload `party_role` with job context.

| Layer | Table | Purpose |
|-------|-------|---------|
| **Master tags** | `party_role` | Address-book classification; drives filtered list Surfaces; **not** an editable multi-select on type detail Surfaces — see [party list/detail](#decision-party-listdetail-surface-shape-2026-06-16-locked-2026-06-17) |
| **Job stakeholders** | `job_party` *(job slice)* | Per-job counterparty graph: customer, owner, bill-to, GC, sub chain, etc. |

**Master `party_role` enum (v1):** `customer`, `vendor`, `manufacturer`, `employee`, `property_owner`, `other`.

- **Not** master tags: `general_contractor`, `subcontractor` — express these on `job_party` (the GC may *also* be tagged `customer` in the address book).
- **`employee`** remains a master tag for internal staff; staff HR fields on `employee` table — [deferred columns](#decision-employee-hr-fields-deferred-2026-06-16). Login linkage moves to `party_user` in the [party identity slice](#decision-party-identity--party_user--user_class-deferred-2026-06-15) (interim: `employee.latch_user_id`).

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


### Decision: party identity — `party_user` + `user_class` (deferred) (2026-06-15)

**Choice:** **Deferred** — hold DDL until we have a clearer picture of **who** may log in (staff only vs customers, GCs, site contacts, etc.). Document now in [`schema/current.dbml`](../schema/current.dbml); do **not** implement in Slice 2.

| Piece | Intent |
|-------|--------|
| `party_user` | Person ↔ `latch_users` bridge for **any** SubHub login (not only staff). FK → `party_person` (persons only — orgs do not log in). Opt-in: most contacts never get a row. |
| `party_user` profile | Session-facing fields on the link row: `display_name` (shell override, fallback `party.display_name`), `avatar_url` (URL until polymorphic `attachment` lands). Credentials stay on `latch_users`; structured name on `party_person`. |
| `latch_users.user_class` | `internal` \| `external` — separates staff auth plane from customer/partner portal principals |
| Portal app roles + row scope | External users see only data tied to their party / `job_party` rows |

**Interim (shipped):** staff login via `employee.latch_user_id`; migrate to `party_user` when the identity slice lands. Customer portal and external row scope remain out of scope until then.

**Rationale:** Identity generalization is platform-shaped (principal kind, scoped manifests). Exact portal audience (stakeholders, GCs, customers) is still being defined — `party_user` avoids overloading `employee` with non-staff logins. Slice 2 proceeds on sites/locations without blocking on Latch policy changes.


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

**Not on `employee`:** name (`party_person`), list display (`party`), phones/emails (`party_phone` / `party_email`), login (`party_user`), permissions (`latch_user_roles`).

**Rationale:** Slice 1 needs a staff marker and surfaces, not a full HR module. Lock the field list now so `party_user` and portal identity do not absorb staff-only data.


### Decision: `employee_detail` scope — marker now, HR later (2026-06-17)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O7).

**Choice:** Two-wave sequence (option C):

| Phase | `employee_detail` Fields | DDL |
|-------|--------------------------|-----|
| **Through wave 1+** | `profile` (via `party_person`), `staff` marker, `account_link` (interim `employee.latch_user_id`) | No HR columns — see [employee HR fields](#decision-employee-hr-fields-deferred-2026-06-16) |
| **HR + identity slice** | Add planned HR scalar Fields (`hire_date`, `employee_number`, `job_title`, …) | Same migration batch as [`party_user`](#decision-party-identity--party_user--user_class-deferred-2026-06-15) promotion |

**Rationale:** Wave 1 party refactor and site slice do not need HR scope. Catalog documents the future Field list without blocking implementation. Name, phones, emails stay on party collections; IAM permissions stay on platform tables.
