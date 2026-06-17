# 18 — Site and location migration

> **Deferred** until [17-schema-design-pass.md](./17-schema-design-pass.md) exits. Migration file numbers (`018`–`020`) may be renumbered when batched with party refactor and later slices.

## Goal

Business DDL for sites, normalized locations, attachment junctions, site contacts, and relation catalog — per [decisions.md](../decisions.md) (2026-06-15) and Slice 2 planning gate (task **16**). Expand `party_role` master enum. **DDL only** — no Surfaces, DAL, or UI in this task.

## Prerequisites

[17-schema-design-pass.md](./17-schema-design-pass.md) complete ([`current.dbml`](../schema/current.dbml) through Slice 6 stable).

## Files

| File | Action |
|------|--------|
| `migrations/018_party_refactor.sql` | **Create** — `party_person`, `party_organization`, `note`; backfill from `016`; retarget `employee` → `party_person`; drop `party.notes`; widen `party_role.role` check |
| `migrations/019_site.sql` | **Create** — `location`, `site`, `party_location`, `site_contact_relation`, `site_contact` |
| `migrations/020_site_contact_relation_dev_seed.sql` | **Create** — optional dev fixtures for relation catalog (approved 2026-06-16) |

> Business DDL continues from `016`–`017` (party). Platform migrations remain `001`–`015`. **No business `INSERT`s in `019_site.sql`** — `site_contact_relation` DDL is empty ([task 16](./16-slice2-planning-gate.md)). Local QA: `020_site_contact_relation_dev_seed.sql` (Postgres-assigned ids; idempotent on `display_name`).

**Party refactor before sites:** Shipped `016_party.sql` still has inline `party.notes` and `employee` → `party`; [`current.dbml`](../schema/current.dbml) targets kind extensions and polymorphic `note`. Run a dedicated **`018_party_refactor.sql` batch before `019_site.sql`** so Slice 1 DAL/surfaces migrate once, not after sites land. **Backfill:** person → `party_person.first_name` from `display_name`, `last_name` `''`; organization → `party_organization` (optional `dba_name` when `display_name` ≠ `legal_name`); non-empty `party.notes` → one `note` row per party (`entity_type = 'party'`); then drop `party.notes`.

## Steps

### 1. Party refactor (`018_party_refactor.sql`)

Create `party_person`, `party_organization`, and `note`; backfill per paragraph above; retarget `employee.party_id` → `party_person`; drop `party.notes`. Widen `party_role_role_check` to allow:

`customer`, `vendor`, `manufacturer`, `employee`, `property_owner`, `other`

### 2. `location` — normalized address (manual entry)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | `gen_random_uuid()::text` |
| `label` | `TEXT` | Short name (“Suite 1200”, “Loading dock”) |
| `line1`, `line2` | `TEXT` | |
| `city`, `state`, `postal_code`, `country` | `TEXT` | `country` default `'US'` |
| `lat`, `lng` | `NUMERIC` | nullable; optional manual pin |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | business-anchor convenience |

No address verification / type-ahead columns in this migration ([deferred](../decisions.md#decision-address-verification--deferred-2026-06-15)).

### 3. `site` — logical place

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | |
| `name` | `TEXT NOT NULL` | |
| `parent_site_id` | `TEXT` | nullable FK → `site.id` (`ON DELETE SET NULL`) |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

Index on `parent_site_id`. No address columns or location FK; no inline `notes` ([shared notes](../decisions.md#decision-notes-and-attachments-shared-tables-deferred-2026-06-15)).

### 4. Junction: `party_location`

| Column | Type | Notes |
|--------|------|-------|
| `party_id` | `TEXT` | FK → `party` `ON DELETE CASCADE` |
| `location_id` | `TEXT` | FK → `location` `ON DELETE CASCADE` |
| `purpose` | `TEXT NOT NULL` | check: `billing`, `remit_to`, `hq`, `mailing`, `other` |
| | | PK or unique on `(party_id, location_id, purpose)` |

### 5. `site_contact_relation` — catalog

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | `gen_random_uuid()::text` |
| `display_name` | `TEXT NOT NULL` | e.g. “Property owner” |
| `sort_order` | `INTEGER` | default `0` |

**Empty in `019_site.sql`** (task 16): no `INSERT`s in the DDL migration. Suggested rows for progressive setup and dev seed: Property owner, Property manager, Site superintendent, Other — see [progressive setup](../decisions.md#decision-progressive-setup--master-catalogs-2026-06-16). Billing contact is customer-scoped (`party` / `job_party`), not site standing contact.

**Dev seed (approved):** `020_site_contact_relation_dev_seed.sql` inserts the four display names above when missing (`sort_order` 10–40). No hard-coded ids.

### 6. `site_contact` — standing contacts at a site

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | |
| `site_id` | `TEXT` | FK → `site` `ON DELETE CASCADE` |
| `party_id` | `TEXT` | FK → `party` `ON DELETE CASCADE` |
| `relation_id` | `TEXT` | FK → `site_contact_relation` `ON DELETE RESTRICT` |
| `sort_order` | `INTEGER` | default `0` |

Unique `(site_id, party_id, relation_id)` unless product needs duplicates.

### 7. Grants and migrate

- Grant `latch_app` on new tables (same pattern as `016_party.sql`).
- `node scripts/db-migrate.mjs --dir=apps/subhub`

### 8. Out of scope for this migration

| Piece | Slice / task |
|-------|----------------|
| Relation catalog dev seed | `020_site_contact_relation_dev_seed.sql` (approved; optional local QA) |
| Address verification / type-ahead API | later (with location UI) |
| `attachment` shared table | deferred |
| `site_system` / installed assets | catalog slice (items/parts) |
| `job`, `job_party`, `job_location` | 5 |
| `party_user`, `latch_users.user_class` | future identity slice |
| Surface YAML, codegen, DAL, UI | tasks **19–20** |

## Verify (stop gate)

- [ ] `node scripts/db-migrate.mjs --dir=apps/subhub --check` passes
- [ ] `party_person`, `party_organization`, `note` exist; `party.notes` dropped; `employee.party_id` → `party_person`
- [ ] Tables exist: `location`, `site`, `party_location`, `site_contact_relation`, `site_contact`
- [ ] `party_role` accepts `property_owner` and `other`
- [ ] `site.parent_site_id` self-FK works; no address columns or location FK on `site`
- [ ] No `site_location` table; no `code` on `site_contact_relation`
- [ ] `site_contact.relation_id` → `site_contact_relation`
- [ ] No `site_system` table
- [ ] `site_contact_relation` empty after `019_site.sql` only (dev seed in `020` is separate)
- [ ] [`../../STATUS.md`](../../STATUS.md) → [19-site-surfaces.md](./19-site-surfaces.md) *(create when starting surfaces)*

## Reference

- [15-entity-flow.md](./15-entity-flow.md) · [16-slice2-planning-gate.md](./16-slice2-planning-gate.md)
- [decisions.md](../decisions.md) — site/location, in-building scope, relation catalog
- [architecture.md](../architecture.md) — data model + entity flow
- [child-collections.md](../child-collections.md) — `site_detail` collections (task 19+)
- [17-schema-design-pass.md](./17-schema-design-pass.md) — schema must exit first
