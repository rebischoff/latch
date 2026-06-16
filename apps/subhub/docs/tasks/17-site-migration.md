# 17 — Site and location migration

## Goal

Business DDL for sites, normalized locations, attachment junctions, site contacts, and relation catalog — per [decisions.md](../decisions.md) (2026-06-15) and Slice 2 planning gate (task **16**). Expand `party_role` master enum. **DDL only** — no Surfaces, DAL, or UI in this task.

## Prerequisites

[16-slice2-planning-gate.md](./16-slice2-planning-gate.md) complete.

## Files

| File | Action |
|------|--------|
| `migrations/018_party_role_expand.sql` | **Create** — widen `party_role.role` check constraint |
| `migrations/019_site_location.sql` | **Create** — `location`, `site`, junctions, `site_contact_relation`, `site_contact` |

> Business DDL continues from `016`–`017` (party). Platform migrations remain `001`–`015`. **No seed migration** unless task **16** locked catalog default rows — see [seeding decision](../decisions.md#decision-business-data-seeding-2026-06-15).

## Steps

### 1. Expand `party_role` enum

Alter `party_role_role_check` to allow:

`customer`, `vendor`, `manufacturer`, `employee`, `property_owner`, `other`

No data migration required.

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

Index on `parent_site_id`. No address columns; no inline `notes` ([shared notes](../decisions.md#decision-notes-and-attachments-shared-tables-deferred-2026-06-15)).

### 4. Junction: `site_location`

| Column | Type | Notes |
|--------|------|-------|
| `site_id` | `TEXT` | FK → `site` `ON DELETE CASCADE` |
| `location_id` | `TEXT` | FK → `location` `ON DELETE CASCADE` |
| `purpose` | `TEXT NOT NULL` | check: `primary`, `service_entrance`, `loading_dock`, `other` |
| | | PK `(site_id, location_id, purpose)` or surrogate `id` + unique on triple |

See [purpose examples](../decisions.md#decision-location-attachments-2026-06-15).

### 5. Junction: `party_location`

| Column | Type | Notes |
|--------|------|-------|
| `party_id` | `TEXT` | FK → `party` `ON DELETE CASCADE` |
| `location_id` | `TEXT` | FK → `location` `ON DELETE CASCADE` |
| `purpose` | `TEXT NOT NULL` | check: `billing`, `remit_to`, `hq`, `mailing`, `other` |
| | | PK or unique on `(party_id, location_id, purpose)` |

### 6. `site_contact_relation` — catalog

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | `gen_random_uuid()::text` |
| `code` | `TEXT UNIQUE` | stable key, e.g. `property_owner` (optional but useful) |
| `display_name` | `TEXT NOT NULL` | e.g. “Property owner” |
| `sort_order` | `INTEGER` | default `0` |

Default rows at migrate time: per task **16** Decision only.

### 7. `site_contact` — standing contacts at a site

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | |
| `site_id` | `TEXT` | FK → `site` `ON DELETE CASCADE` |
| `party_id` | `TEXT` | FK → `party` `ON DELETE CASCADE` |
| `relation_id` | `TEXT` | FK → `site_contact_relation` `ON DELETE RESTRICT` |
| `sort_order` | `INTEGER` | default `0` |

Unique `(site_id, party_id, relation_id)` unless product needs duplicates.

### 8. Grants and migrate

- Grant `latch_app` on new tables (same pattern as `016_party.sql`).
- `node scripts/db-migrate.mjs --dir=apps/subhub`

### 9. Out of scope for this migration

| Piece | Slice / task |
|-------|----------------|
| Business seed / dev fixtures | only after explicit discussion |
| Address verification / type-ahead API | later (with location UI) |
| `note`, `attachment` shared tables | deferred |
| `site_system` / installed assets | catalog slice (items/parts) |
| `job`, `job_party`, `job_location` | 5 |
| `party_user`, `latch_users.user_class` | future identity slice |
| Surface YAML, codegen, DAL, UI | tasks **18–19** |

## Verify (stop gate)

- [ ] `node scripts/db-migrate.mjs --dir=apps/subhub --check` passes
- [ ] Tables exist: `location`, `site`, `site_location`, `party_location`, `site_contact_relation`, `site_contact`
- [ ] `party_role` accepts `property_owner` and `other`
- [ ] `site.parent_site_id` self-FK works; no address columns on `site`
- [ ] `site_contact.relation_id` → `site_contact_relation`
- [ ] No `site_system` table
- [ ] Relation catalog matches task **16** Decision (empty vs default rows)
- [ ] [`../../STATUS.md`](../../STATUS.md) → [18-site-surfaces.md](./18-site-surfaces.md) *(create when starting surfaces)*

## Reference

- [15-entity-flow.md](./15-entity-flow.md) · [16-slice2-planning-gate.md](./16-slice2-planning-gate.md)
- [decisions.md](../decisions.md) — site/location, purpose examples, relation catalog
- [architecture.md](../architecture.md) — data model + entity flow
- [child-collections.md](../child-collections.md) — `site_detail` collections (task 18+)
