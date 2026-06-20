# SubHub decisions — site

> Sites, postal addresses, site geography, standing contacts, and Slice 2 scope.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: address vs site geography — rename and split (2026-06-17)

**Choice:**

| Term | Table | Purpose |
|------|--------|---------|
| **Address** | `address` | Postal / geocode — `line1`, city, state, … |
| **Party address** | `party_address` | Junction: billing, HQ, mailing, … |
| **Section** | `site_section` | Coarse site geography — Floor 3, Mauka, Courtyard |
| **Location** | `site_location` | Exact work spot — Door A-32, Rm 345 Cam 1 |

**Supersedes** [site vs location](#decision-site-vs-location--separate-entities-2026-06-15), [location attachments](#decision-location-attachments-2026-06-15), and [in-building work scope](#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17) (postal vs in-building split).

- Renamed `location` → **`address`**; `party_location` → **`party_address`**.
- Dropped **`job_location`** — in-building scope is **`site_section` / `site_location`** on the **site**, referenced by estimate/job lines.
- **`site` has no inline postal columns**; customer billing postal via `party_address`. **Amended (2026-06-19):** optional **`site.physical_address_id`** FK for dispatch/maps — [postal spine](#decision-postal-address--normalized-spine-and-party-vs-site-roles-2026-06-19).

**Rationale:** Domain “location” means where work is performed at a property, not a street address row. One address row can serve party billing without conflating it with camera positions.


### Decision: portfolio FKs on `site_detail` — writable scalars (2026-06-19)

**Status:** Locked in [`site.md`](../surface-specs/site.md) (task 19).

**Choice (Option A):** Expose both portfolio links as **writable optional scalar Fields** on **`site_detail`** in wave 1:

| Field id | Column | Picker filter |
|----------|--------|---------------|
| `customer_party` | `site.customer_party_id` | `party_role.customer` + `party.kind = organization` |
| `property_owner_party` | `site.property_owner_party_id` | `party_role.property_owner` (org or person) |

- **Standalone create** from `site_list`: `name` only; both FKs null.
- **Hub `add_site`** remains primary create path — customer hub sets `customer_party_id` only; property-owner hub sets `property_owner_party_id` only.
- **PATCH** may set, change, or clear either FK independently (unlink without deleting site).
- **Read DTO** includes `*_display_name` for cross-links to `/customers/[id]` and `/property-owners/[id]` when granted.

**Rationale:** Customer hub spec requires reassignment from `site_detail` for unlinked sites ([`customer.md`](../surface-specs/customer.md) edge case). Symmetric owner FK supports payer ≠ owner and repair after `ON DELETE SET NULL` on party delete. Tag-filtered pickers prevent conflating portfolio links with arbitrary parties.


### Decision: site delete — blockers and cascade (2026-06-19)

**Status:** Locked in [`site.md`](../surface-specs/site.md) (task 19).

**Choice:**

| Condition | Delete |
|-----------|--------|
| `estimate.site_id` or `job.site_id` references site | **Block** — `ConflictError` (`estimate` / `job` blockers); DB `RESTRICT` |
| Any `site.parent_site_id` points at this site | **Block** — `ConflictError` (`child_site` blocker); **app pre-check** (DB would `SET NULL` on parent delete) |
| `site_contact`, `site_section`, `site_location` | **Cascade** — no blocker |
| No blockers | **Hard delete** |

**Rationale:** Engagements must keep a stable site anchor. Child sites in a hierarchy must be explicitly reparented or deleted before removing a parent — silent `SET NULL` is wrong once `parent_site_id` is in use (wave 2b+). Standing contacts and geography are owned by the site row.


### Decision: site orphans and naming (2026-06-19)

**Status:** Locked in [`site.md`](../surface-specs/site.md) fork #9 (task 19).

**Choice:**

- Sites with **null** portfolio FK(s) are **valid** — no required portfolio link; no orphan badge on `site_list` in wave 1.
- **Partial link** (customer only, owner only, or both) is valid; hub trees include site only where matching FK is set.
- **`site.name`** — **no** global unique constraint; duplicate building names allowed.
- **Party delete** — portfolio FKs `SET NULL`; site becomes orphan until reassigned on `site_detail`.
- **Attach existing site from hub** — deferred v1; repair via `site_detail` pickers.

**Rationale:** Nullable FKs support create-before-customer and migration backfill; disambiguation via portfolio context on detail/hubs, not forced uniqueness on name.


### Decision: `site.customer_party_id` — explicit portfolio link (2026-06-18)

**Status:** Locked for **customer** hub tree ([customer hub](./party.md#decision-customer-hub--portal-tree-and-related-lists-2026-06-18)). Vendors do not use portfolio sites ([vendor hub](./party.md#decision-vendor-hub--subsidiaries-contacts-and-pos-2026-06-18)). **DDL deferred** until site migration wave.

**Choice:** Add nullable → required-on-create-from-hub FK **`site.customer_party_id` → `party.id`** (customer- or vendor-tagged org in practice). Identifies which **address-book party** owns the property in portfolio UI. Distinct from:

| Mechanism | Purpose |
|-----------|---------|
| **`site.customer_party_id`** | Standing portfolio link for customer hub tree + “create site from customer” |
| **`site.property_owner_party_id`** | Standing portfolio link for property-owner hub + `related_sites` — [decision below](#decision-siteproperty_owner_party_id--portfolio-link-2026-06-18) |
| **`site.parent_site_id`** | Geographic hierarchy (campus → building) — unchanged |
| **`job_party`** | Per-engagement counterparty graph (customer, bill-to, GC, …) on a specific job |

**Rules:**

- Creating a site from **`customer_detail`** sets `customer_party_id` to the selected tree org node (subsidiary or top-level). Vendors do not create sites ([vendor hub](./party.md#decision-vendor-hub--subsidiaries-contacts-and-pos-2026-06-18)).
- **`job` / `estimate` create** may default primary customer `job_party` row from `site.customer_party_id` and/or user-selected subsidiary; engagement graph remains authoritative per job.
- Sites without a portfolio owner may exist briefly in migration; hub UI treats unassigned sites as outside the tree until linked.

#### Options considered (site ↔ customer link)

| Option | Pros | Cons | Example |
|--------|------|------|---------|
| **A — Explicit `site.customer_party_id` (chosen)** | Tree works before any job; “all properties for Tower REIT”; subsidiary can own sites; create site from customer hub | Must set on create; can diverge from `job_party` if users mis-pick | Tower REIT → subsidiary “Tower West” → site “200 Market Tower” appears under West in tree **before** first estimate |
| **B — Derive only from `job_party` + `site_id` on jobs** | No redundant FK; job graph is sole source | Empty customer tree until jobs exist; same physical site ambiguous when different jobs name different customers; cannot list portfolio for new customer | New customer — no jobs yet — **cannot** show sites |
| **C — Derive from `site_contact` only** | Reflects standing people at property | Conflates contacts with ownership; org property portfolio still missing | REIT listed as site contact ≠ portfolio ownership |

**Rationale:** Combined customer tree (subsidiaries + sites) and create-from-hub require a stable party↔site edge that does not depend on job history. Per-job roles stay on `job_party`; portfolio ownership is **`site.customer_party_id`**.


### Decision: `site.property_owner_party_id` — portfolio link (2026-06-18)

**Status:** Locked for **property owner** hub ([property owner hub](./party.md#decision-property-owner-hub--subsidiaries-contacts-and-sites-2026-06-18)). **DDL deferred** until site migration wave.

**Choice:** Add nullable FK **`site.property_owner_party_id` → `party.id`** (property_owner-tagged org or person in practice). Identifies which **address-book party** legally owns the property for **`property_owner_detail`** `related_sites` and **`add_site`**. Distinct from:

| Mechanism | Purpose |
|-----------|---------|
| **`site.property_owner_party_id`** | Portfolio link for property-owner hub + `related_sites` |
| **`site.customer_party_id`** | Portfolio link for customer hub / billing tree — [decision above](#decision-sitecustomer_party_id--explicit-portfolio-link-2026-06-18) |
| **`site_contact`** | Standing people/orgs **at** a property — not ownership |
| **`job_party`** | Per-engagement stakeholder graph |

**Rules:**

- Creating a site from **`property_owner_detail`** sets `property_owner_party_id` to the selected org node (subsidiary or top-level). Does **not** set `customer_party_id`.
- A site may have **both** FKs when payer (`customer`) ≠ legal owner (`property_owner`).
- **`ON DELETE`** on `party` → **`SET NULL`** on `site.property_owner_party_id` (unlink; does not block party delete on this lens).
- Property-owner hub does **not** list engagements or invoices — those stay on customer / job Surfaces.

**Rationale:** GC/sub jobs often name a building owner who is not the AR customer. Explicit owner FK mirrors `customer_party_id` without overloading the customer hub.


### Decision: postal address — normalized spine and party vs site roles (2026-06-19)

**Status:** Locked for task 19 (`party-addresses.md`, `site-geography.md`). **DDL:** `address` + `party_address` in task 17; **`site.physical_address_id`** deferred to wave 2b migration after task 19.

**Choice:** Keep **`address`** and **`party_address`** as **two tables** — do **not** merge. Postal payload (`line1`, city, state, …) lives on **`address`**; party relationship metadata (`purpose`) lives on **`party_address`**.

| Piece | Role |
|-------|------|
| **`address`** | Shared **postal spine** — manual entry v1; verification deferred |
| **`party_address`** | Junction: `party_id` + `address_id` + `purpose` (`billing`, `remit_to`, `hq`, `mailing`, `other`) |
| **`site.physical_address_id`** *(wave 2b)* | Optional FK → `address` — **dispatch / maps** (“drive here”); **not** billing |
| **`party_address` on `{role}_detail`** | Mail / AP / AR — wave 2 UI on customer, vendor, manufacturer, property_owner lenses |

**Cardinality:**

- **Many sites → one `address` row** allowed (campus children share one street row).
- **Not** required 1:1 site↔address.
- **Do not** inline postal columns on `site`.

**DBML:** `address` lives in **`TableGroup postal`** (shared spine) — not under `site` only. `party_address` stays in **`TableGroup party`**.

**On create (product):** UI may **suggest** copying customer `hq` into site physical address — **never** auto-sync ongoing.

**Options considered — merge `address` + `party_address`:**

| Option | Pros | Cons |
|--------|------|------|
| **Normalized spine (chosen)** | Share street across parties/sites; one verification/geocode update; composite PK carries `purpose` | Slightly more DAL on collection PATCH |
| **Single wide table** | Simpler replace-array | Duplicates postal rows; blocks site physical FK reuse |

**Rationale:** Same street can serve multiple parties and campus buildings. Billing (party) and dispatch (site) are different questions. Normalized spine matches future verification and optional `site.physical_address_id` without a later split migration.


### Decision: shared `address` row — copy-on-write on PATCH (2026-06-19)

**Status:** Locked for task 19 ([`party-addresses.md`](../surface-specs/party-addresses.md)).

**Choice:** When a `{role}_detail` **replace-array** PATCH changes **postal identity** fields (`line1`, `line2`, `city`, `state`, `postal_code`, `country`) on an `address` row that is still referenced by **another** `party_address` row or by **`site.physical_address_id`**, the DAL **must not** `UPDATE` the shared row in place. Instead: **insert** a new `address` row with the edited postal values and **repoint** only the current party’s `party_address` junction to the new id.

| Edit type | Shared row? | Action |
|-----------|-------------|--------|
| Postal identity fields | yes | Copy-on-write → new `address.id` |
| Postal identity fields | no (sole referrer) | In-place `UPDATE` |
| `label`, `lat`, `lng` only | yes or no | In-place `UPDATE` (does not change shared street identity) |
| Remove from party array | — | Delete junction; **GC** `address` when zero `party_address` and zero `site.physical_address_id` refs |

**Rationale:** Normalized spine intentionally allows campus sites and sibling parties to share one street row. In-place edits from one party form would silently change dispatch/billing context for others. Copy-on-write preserves sharing for unchanged referrers while keeping replace-array PATCH semantics simple for the UI.


### Decision: site nesting — when `site` vs `site_location` vs `job` (2026-06-19)

**Status:** Locked for task 19 (`site-geography.md`, `party-addresses.md`).

**Choice:** **`site`** = where work is performed (`estimate.site_id`, `job.site_id`). Use the **smallest correct entity** for each change — do not create sites for every stakeholder or suite by default.

| Situation | Entity |
|-----------|--------|
| New **building** on a campus | **Child `site`** (`parent_site_id` → campus) |
| New **suite / room / device spot** in same building | **`site_location`** on the building `site` (optional **`site_section`** to group) |
| New **customer / payer** for work in existing space | **`party`** + **`job_party`** on a new **`job`** — not a new `site` |
| Building-wide **service contract** | Long-lived **`job`** (`job_kind` = service) on building **`site`** |
| Standing superintendent / property mgr | **`site_contact`** |
| Corporate **billing / remit-to** mail | **`party_address`** on customer/vendor party |
| Tenant needs **own portfolio subtree** (rare) | **Child `site`** with own `customer_party_id`; building-wide as-built (`site_location` for FA, etc.) stays on **parent** building `site` |

**Default rule:**

> Tenant suites and stakeholder changes use **`site_location` + `job_party`** on the building **`site`**. Child **`site`** only when the tenant needs a standing portfolio / customer subtree distinct from the parent building.

**Reject:**

- Strict **site↔address 1:1**
- **Child site per tenant** when only payer or scope changes
- Generic “any party tied to any site” — use typed edges: portfolio FKs, `site_contact`, `job_party`

**Rationale:** Building A fire-alarm as-built, remodels, and per-tenant service jobs share one operational anchor. Splitting tenants into child sites fragments device geography. Per-job stakeholders already live on `job_party`.


### Decision: `site_detail` geography — implement defaults (2026-06-19)

**Status:** Locked in [`site-geography.md`](../surface-specs/site-geography.md) (task 19).

**Choice:**

| Topic | Rule |
|-------|------|
| Default status on `site_detail` add | **`active`** for `sections` / `locations` — `proposed` only from estimate/job DAL |
| `physical_address` | Scalar postal group → `address` + `site.physical_address_id`; copy-on-write when shared |
| Suggest dispatch | One-time **Suggest from customer HQ** — never auto-sync |
| Remove referenced location | **Reject** omit-from-array unless status is `removed`, `relocated`, or `cancelled` |
| Unreferenced location omit | Hard **DELETE** |
| Section omit | Hard **DELETE**; locations in same PATCH clear `site_section_id` |
| Relocate | `status = relocated` + `replaced_by_site_location_id` → **active** location on same site |
| Label edit | Block when referenced by **`job_line`** on **`job.status = complete`** |
| UI order | Below `contacts`: `parent_site` → `physical_address` → `sections` → `locations` |

**Rationale:** As-built setup on `site_detail` is authoritative registry work — default `active`. Quote-only places stay `proposed` until job complete. Tombstone rules preserve line FK integrity without a separate relocate action.


### Decision: section vs location — granularity (2026-06-19)

**Status:** Locked for task 19 (`site-geography.md`). **Amends** [site-owned sections and locations](#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17) with operator-facing rules.

**Choice:**

| | **`site_section`** | **`site_location`** |
|---|-------------------|---------------------|
| **Role** | Optional **coarse bucket** for grouping UI and reports | **Atomic work spot** — what lines reference |
| **Examples** | Floor 3, Mauka wing, Warehouse, Suite 200 *(as zone)* | Rm 345, Front door A-32, FA panel — basement, Stall 3 |
| **Structure** | **Flat list** per site — no nested `parent_section_id` | Optional `site_section_id` → section |
| **Estimate / job lines** | Do **not** FK section | **`site_location_id` only** |

**One-line rule:** **Sections organize; locations pin work.**

**Granularity (trade-flexible):**

- Operators choose depth per job — do not mandate “suite is always section.”
- **One location, no section** is valid (e.g. single label “Suite 200” for a whole-suite remodel).
- **Section without many locations** is valid when one room is the whole scope (e.g. “3rd fl bathroom” as section, “Stall 3” as location — or bathroom as sole location for a small plumbing job).
- **Campus → building** hierarchy uses **`site.parent_site_id`**, not nested sections.

**Heuristics:**

| Question | Answer |
|----------|--------|
| Smallest thing a line item references? | **`site_location`** |
| When add a section? | Multiple locations to group |
| Can a location exist without a section? | **Yes** (`site_section_id` null) |

**Rationale:** Integrators scope from room/device up to floor/wing depending on trade. Schema stays simple: lines always FK `site_location_id`; sections are optional grouping. Nesting sections would duplicate `parent_site_id` semantics.


### Decision: site-owned sections and locations — lifecycle and history (2026-06-17)

**Amended (2026-06-17):** flat sections, slim rows, `latch_audit` for provenance — see [site geography audit](#decision-site-geography--slim-rows-and-latch_audit-2026-06-17).

**Choice:** **`site_section`** and **`site_location`** are owned by **`site`**, persist across jobs (as-built), and are optional until needed.

| Status | Meaning |
|--------|---------|
| `proposed` | Introduced on estimate or open job — not yet as-built |
| `active` | Current site map |
| `relocated` | **`site_location` only** — superseded; `replaced_by_site_location_id` points forward |
| `removed` | No longer at site |
| `cancelled` | Proposed but never built (lost quote / dropped scope) |

**`site_section`:** flat list (`sort_order` only — **no** nested `parent_section_id`).

**Who may create rows (Policy B):** `site_detail` admin, **estimates**, and **any `job_kind`** (install, service, add-on, warranty). Add-on jobs may add, remove, or relocate prior installations.

**Estimate flow:** estimating may create **`proposed`** sections/locations on the quote site; the job refines them; **`job.status → complete`** publishes surviving `proposed` → `active` and applies relocations/removals. **Does not rewrite** `job_line.site_location_id` on closed jobs.

**Historic FKs:** never hard-delete `site_location` rows referenced by lines or work items; tombstone via `status`. Relocate = new/target row + old row `relocated`.

**Surfaces:** child collections `sections` and `locations` on `site_detail` ([child-collections.md](../child-collections.md)).

**Rationale:** Service calls and add-ons reuse as-built geography. Moves (RM 123 → RM 124) need current site truth and frozen job history.


### Decision: site geography — slim rows and `latch_audit` (2026-06-17)

**Choice (Option A):** No `site_audit` table in v1. **`site_section` / `site_location`** hold **current state** only; provenance (who introduced, removed, relocated, when) comes from **`latch_audit`** on DAL mutations.

| On entity row | Keep | Drop |
|---------------|------|------|
| `site_section` | `site_id`, `title`, `sort_order`, `status` | `parent_section_id`, `replaced_by_*`, `introduced_by_*`, `removed_by_*` |
| `site_location` | above + `site_section_id`, `label`, `replaced_by_site_location_id` | `introduced_by_*`, `removed_by_*` |

**`replaced_by_site_location_id`** stays for fast current-map / relocate-chain queries. Defer typed **`site_audit`** until an as-built timeline UI needs it without parsing audit JSON.

**Rationale:** Avoid duplicating audit systems; Latch invariant #6 already append-only. Slim entities; add domain audit table only when reporting pain is real.


### Decision: site geography on `site_detail` — timing (2026-06-17)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O6).

**Choice:**

| Wave | `site_detail` geography |
|------|-------------------------|
| **Wave 1** | `name` + `contacts` only — DDL creates `site_section` / `site_location` tables but **no UI** |
| **Wave 2b** | `sections` + `locations` child collections on `site_detail` — **source of truth** for place |
| **Wave 4+** | Estimates reference `site_id`; lines use `site_location_id`; grouped editor needs wave 2b registry |

**Rationale:** Site must be set up before estimates/jobs meaningfully group by section/location ([estimate/job line grouping](./estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17)). Wave 4 may ship with flat `line_items` first; grouped mode follows wave 2b.


### Decision: site vs location — separate entities (2026-06-15) — **superseded**

**Superseded by** [address vs site geography](#decision-address-vs-site-geography--rename-and-split-2026-06-17) (2026-06-17). Former `location` table is now **`address`**; domain “location” is **`site_location`**.


### Decision: location attachments (2026-06-15) — **superseded**

**Superseded by** [address vs site geography](#decision-address-vs-site-geography--rename-and-split-2026-06-17) and [site-owned sections and locations](#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17). **`job_location`** dropped.


### Decision: in-building work scope — estimate → job lifecycle (2026-06-16) — **superseded**

**Superseded by** [site-owned sections and locations](#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17). Line placement: `estimate_line.site_location_id`, `job_line.site_location_id` → **`site_location`** on the quote/job site.


### Decision: address verification — deferred (2026-06-15)

**Choice:** **Defer** third-party address verification and autocomplete (type-ahead) to a later slice. Slice 2 **`address`** DDL is **manual entry** — address lines, city, state, postal code, country, optional `lat`/`lng`. No verification provider columns, no geocoder integration, in task 17.

**Rationale:** Primary payoff of verification APIs is **type-ahead UX** at data entry time; that belongs with `site_detail` / `{role}_detail` address Fields, not bare DDL. Add `verified_at` / provider metadata when a vendor is chosen.


### Decision: site contacts — `site_contact_relation` catalog (2026-06-15)

**Choice:**

- **`site_contact_relation`** — catalog table (`id`, `display_name`, `sort_order`). Seeded defaults in DDL migration only if discussed ([seeding rule](./cross-cutting.md#decision-business-data-seeding-2026-06-15)); otherwise empty catalog at migrate time. **Admin UI:** dedicated [catalog table Surface](./general.md#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16) (`site_contact_relation_table`), not master-detail. No `code` column — use `id` for FKs; display names are admin-editable.
- **`site_contact`:** `site_id` + `party_id` + `relation_id` FK → `site_contact_relation`. Standing people/orgs at a property. **Not** a substitute for `job_party`.
- **No inline `notes`** on `site_contact` — use [shared notes](./cross-cutting.md#decision-notes-and-attachments--shared-tables-deferred-2026-06-15) when that slice lands.
- **Billing contact** is on the **customer** (`party` / `party_address` billing, or `job_party` `bill_to`) — not a `site_contact_relation` row.

Suggested first-use relation rows (display names, not DDL seed): Property owner, Property manager, Site superintendent, Other — collected via [progressive setup](./cross-cutting.md#decision-progressive-setup--master-catalogs-2026-06-16) when the app is first used.

**Rationale:** Relation labels will grow; a catalog avoids repeated CHECK migrations. Job-scoped relations (`job_party`) may get a parallel catalog in the job slice.

**Locked (task 16, 2026-06-16):** **Empty catalog at migrate time** — task 17 creates `site_contact_relation` with no `INSERT`s in `019_site.sql`. First rows in production via progressive setup UI; local QA via approved dev seed `020_site_contact_relation_dev_seed.sql` ([progressive setup](./cross-cutting.md#decision-progressive-setup--master-catalogs-2026-06-16)); no hard-coded seed ids.


### Decision: Slice 2 UI scope — planning gate (2026-06-16)

**Choice (task 16):**

| Topic | Slice 2 | Deferred |
|-------|---------|----------|
| `site_contact_relation` DDL | Empty table (task 17) | Default rows in DDL migration |
| `site_detail` standing contacts | `contacts` child collection (tasks 18–19) | — |
| Relation catalog population | Progressive setup (suggestions) + `site_contact_relation_table` page | DDL `INSERT`s |
| `party_address` DDL | Task 17 (`address` + junction) | — |
| `party_address` on `{role}_detail` | — | wave 2 — `addresses` on customer/vendor/etc. detail Surfaces |
| `site.parent_site_id` DDL | Task 17 (nullable self-FK) | Parent-site picker and list parent column |
| `party_address.purpose` CHECK | `billing`, `remit_to`, `hq`, `mailing`, `other` (task 17) | — |
| `site_section` / `site_location` on `site_detail` | — | After job slice surfaces — DDL in DBML (2026-06-17) |

**Tasks 18–19 headline (Slice 2 exit):** `/sites` master-detail like party type lists. `site_list`: `name` (flat list — no parent column). `site_detail`: `name` CRUD + `contacts` child collection (`party_id`, `relation_id` from catalog per [child-collections.md](../child-collections.md)). **`site_contact_relation_table`:** single-page editable catalog at `/sites/contact-relations` ([catalog table decision](./general.md#decision-catalog-tables--editable-table-page-not-master-detail-2026-06-16)) — not list/detail. No address block on site.

**Rationale:** Ship minimal sites UI and standing-contact wiring while deferring hierarchy, party addresses, and catalog DDL seeds until the broader schema (estimates, jobs) clarifies surface/field shapes.


### Decision: installed systems — deferred to catalog slice (2026-06-15)

**Choice:** **Drop `site_system` from Slice 2** (task 17). Installed assets at a site will be modeled later as **rows tied to catalog items/parts**, not a free-text equipment register.

**Services — three layers (unchanged intent; shifted timing):**

| Layer | Where | Slice |
|-------|--------|-------|
| Installed assets at site | TBD — linked to `item` / parts | 3+ (with catalog) |
| Sellable offerings (SKUs) | `item` / catalog | 3 |
| Scoped work on an engagement | `job_line` / job scope | 5 |

**Rationale:** Equipment without catalog linkage duplicates manufacturer/model text and fights the parts domain. Site slice delivers place + addresses + standing contacts only.


### Decision: site contacts and systems (2026-06-15) — **superseded**

**Superseded by** [site contacts — `site_contact_relation` catalog](#decision-site-contacts--site_contact_relation-catalog-2026-06-15) and [installed systems — deferred](#decision-installed-systems--deferred-to-catalog-slice-2026-06-15) above.
