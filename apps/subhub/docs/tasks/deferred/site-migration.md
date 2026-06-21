# Site and address migration (deferred)

> **Status:** Complete (2026-06-20). Step 1 of [task 20 — UI discovery](../20-ui-discovery.md). **Next:** task 20 [Step 2 — sites CRM slice](../20-ui-discovery.md#step-2--sites-crm-slice-thin-vertical).
>
> **Why it was deferred:** Holistic Surface/Field catalog ([`surfaces.md`](../../surfaces.md)) completed before the next SQL batch. **Now unblocked** at task 19 CRM checkpoint.

## Goal

Business DDL for postal addresses, sites, site geography, site contacts, and relation catalog — per [`current.dbml`](../../schema/current.dbml) and [decisions.md](../../decisions/README.md) (address vs site geography, 2026-06-17). Party refactor batch first. Expand `party_role` master enum. **DDL only** — no Surfaces, DAL, or UI in this task.

## Prerequisites

[18-surface-catalog.md](../18-surface-catalog.md) complete (or explicit override). [17-schema-design-pass.md](../17-schema-design-pass.md) complete.

## Files

| File | Action |
|------|--------|
| `migrations/018_party_refactor.sql` | **Create** — `party_person`, `party_organization`, `note`; backfill from `016`; retarget `employee` → `party_person`; drop `party.notes`; widen `party_role.role` check |
| `migrations/019_site.sql` | **Create** — `address`, `site`, `site_section`, `site_location`, `party_address`, `site_contact_relation`, `site_contact` |
| `migrations/020_site_contact_relation_dev_seed.sql` | **Create** — optional dev fixtures for relation catalog (approved 2026-06-16) |

> Business DDL continues from `016`–`017` (party). Platform migrations remain `001`–`015`. **No business `INSERT`s in `019_site.sql`** — `site_contact_relation` DDL is empty ([task 16](../16-slice2-planning-gate.md)). Local QA: `020_site_contact_relation_dev_seed.sql` (Postgres-assigned ids; idempotent on `display_name`).

**Party refactor before sites:** Shipped `016_party.sql` still has inline `party.notes` and `employee` → `party`; [`current.dbml`](../../schema/current.dbml) targets kind extensions and polymorphic `note`. Run **`018_party_refactor.sql` before `019_site.sql`**. **Backfill:** person → `party_person.first_name` from `display_name`, `last_name` `''`; organization → `party_organization` (optional `dba_name` when `display_name` ≠ `legal_name`); non-empty `party.notes` → one `note` row per party (`entity_type = 'party'`); then drop `party.notes`.

## Steps

### 1. Party refactor (`018_party_refactor.sql`)

Create `party_person`, `party_organization`, and `note`; backfill per paragraph above; retarget `employee.party_id` → `party_person`; drop `party.notes`. Widen `party_role_role_check` to allow:

`customer`, `vendor`, `manufacturer`, `employee`, `property_owner`, `other`

### 2. `address` — normalized postal address (manual entry)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | `gen_random_uuid()::text` |
| `label` | `TEXT` | optional suite/floor on postal row |
| `line1`, `line2` | `TEXT` | |
| `city`, `state`, `postal_code`, `country` | `TEXT` | `country` default `'US'` |
| `lat`, `lng` | `NUMERIC` | nullable; optional manual pin |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | business-anchor convenience |

No address verification / type-ahead columns in this migration ([deferred](../../decisions/site.md#decision-address-verification--deferred-2026-06-15).

### 3. `site` — logical place

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | |
| `name` | `TEXT NOT NULL` | |
| `customer_party_id` | `TEXT` | nullable FK → `party.id` (`ON DELETE SET NULL`) — customer hub portfolio |
| `property_owner_party_id` | `TEXT` | nullable FK → `party.id` (`ON DELETE SET NULL`) — property-owner hub |
| `parent_site_id` | `TEXT` | nullable FK → `site.id` (`ON DELETE SET NULL`) |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

Indexes on `customer_party_id`, `property_owner_party_id`, `parent_site_id`. No address columns on `site`; no inline `notes` ([shared notes](../../decisions/cross-cutting.md#decision-notes-and-attachments--shared-tables-deferred-2026-06-15).

### 4. `site_section` — coarse site geography

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | |
| `site_id` | `TEXT` | FK → `site` `ON DELETE CASCADE` |
| `title` | `TEXT` | e.g. Floor 3, Mauka |
| `sort_order` | `INTEGER` | default `0` |
| `status` | `TEXT` | CHECK: `proposed` \| `active` \| `removed` \| `cancelled` |

Flat list (no nested sections). Provenance via `latch_audit` — no `*-by-*` columns ([decision](../../decisions/site.md#decision-site-geography--slim-rows-and-latch_audit-2026-06-17).

### 5. `site_location` — exact work spot

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | |
| `site_id` | `TEXT` | FK → `site` `ON DELETE CASCADE` |
| `site_section_id` | `TEXT` | nullable FK → `site_section` `ON DELETE SET NULL` |
| `label` | `TEXT` | e.g. Rm 345 Cam 1 |
| `sort_order` | `INTEGER` | default `0` |
| `status` | `TEXT` | CHECK: `proposed` \| `active` \| `relocated` \| `removed` \| `cancelled` |
| `replaced_by_site_location_id` | `TEXT` | nullable self-FK `ON DELETE SET NULL` |

Index on `site_id`. Never hard-delete rows referenced by estimate/job lines — tombstone via `status`.

### 6. Junction: `party_address`

| Column | Type | Notes |
|--------|------|-------|
| `party_id` | `TEXT` | FK → `party` `ON DELETE CASCADE` |
| `address_id` | `TEXT` | FK → `address` `ON DELETE CASCADE` |
| `purpose` | `TEXT NOT NULL` | CHECK: `billing`, `remit_to`, `hq`, `mailing`, `other` |
| | | PK on `(party_id, address_id, purpose)` |

In-building work spots are **`site_location`** on a site — not `party_address`.

### 7. `site_contact_relation` — catalog

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | `gen_random_uuid()::text` |
| `display_name` | `TEXT NOT NULL` | unique |
| `sort_order` | `INTEGER` | default `0` |

**Empty in `019_site.sql`** (task 16). Suggested dev seed rows: Property owner, Property manager, Site superintendent, Other.

### 8. `site_contact` — standing contacts at a site

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | |
| `site_id` | `TEXT` | FK → `site` `ON DELETE CASCADE` |
| `party_id` | `TEXT` | FK → `party` `ON DELETE CASCADE` |
| `relation_id` | `TEXT` | FK → `site_contact_relation` `ON DELETE RESTRICT` |
| `sort_order` | `INTEGER` | default `0` |

Unique `(site_id, party_id, relation_id)`.

### 9. Grants and migrate

- Grant `latch_app` on new tables (same pattern as `016_party.sql`).
- `node scripts/db-migrate.mjs --dir=apps/subhub`

### 10. Out of scope for this migration

| Piece | When |
|-------|------|
| `site_section` / `site_location` UI on `site_detail` | wave 2b per [`surfaces.md`](../../surfaces.md) |
| Relation catalog dev seed | `020_site_contact_relation_dev_seed.sql` (optional local QA) |
| Address verification / type-ahead API | later |
| `attachment` shared table | deferred |
| `job`, `job_party`, estimates, financial tables | waves 4–6 |
| `party_person` login link, `party_email.is_login_email`, login email sync | identity wave (post–task 19) — [decision](../decisions/party.md#decision-login-email--app-sync-to-latch_userslogin_email-2026-06-18) |
| `latch_users.user_class` | portal row scope — deferred |
| Surface YAML, codegen, DAL, UI | wave 1 after this migration |

## Verify (stop gate)

- [x] `node scripts/db-migrate.mjs --dir=apps/subhub --check` passes
- [x] `party_person`, `party_organization`, `note` exist; `party.notes` dropped; `employee.party_id` → `party_person`
- [x] Tables exist: `address`, `site`, `site_section`, `site_location`, `party_address`, `site_contact_relation`, `site_contact`
- [x] `party_role` accepts `property_owner` and `other`
- [x] `site.parent_site_id` self-FK works; no address columns on `site`
- [x] `site_location.replaced_by_site_location_id` self-FK; status CHECK includes `relocated`
- [x] `site_contact.relation_id` → `site_contact_relation`; unique `display_name` on relation catalog
- [x] No `site_system` table; no `site` ↔ `address` direct FK
- [x] `site_contact_relation` empty after `019_site.sql` only (dev seed in `020` is separate)

## Reference

- [surfaces.md](../../surfaces.md) — wave 1 Surfaces (run after catalog exits)
- [18-surface-catalog.md](../18-surface-catalog.md) — planning gate before this resumes
- [15-entity-flow.md](../15-entity-flow.md) · [16-slice2-planning-gate.md](../16-slice2-planning-gate.md)
- [decisions.md](../../decisions/README.md) — address vs site geography
- [architecture.md](../../architecture.md) — entity flow
- [child-collections.md](../../child-collections.md) — `site_detail` collections
