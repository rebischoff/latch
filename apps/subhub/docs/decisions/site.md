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
- **`site` has no postal columns** and no address FK; customer postal via `party_address`.

**Rationale:** Domain “location” means where work is performed at a property, not a street address row. One address row can serve party billing without conflating it with camera positions.


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
