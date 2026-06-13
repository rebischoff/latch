# 10 — Party migration

## Goal

Business DDL for party spine and employee link.

## Prerequisites

Slice 0 complete ([09-dev-roles-seed.md](./09-dev-roles-seed.md)).

## Files

| File | Action |
|------|--------|
| `migrations/014_party.sql` | **Create** — `party`, `party_role`, `party_phone`, `party_email`, `employee` |
| `migrations/015_party_dev_seed.sql` | **Create** — optional dev fixtures |

## Steps

1. `party`: `id TEXT PK`, `kind`, `display_name`, `legal_name`, `notes`, timestamps.
2. `party_role`: `(party_id, role)` unique; check constraint on role enum.
3. `party_phone` / `party_email`: FK `party_id ON DELETE CASCADE`, `is_primary`, sort order.
4. `employee`: `party_id` PK/FK, `latch_user_id` nullable FK → `latch_users`.
5. Use `gen_random_uuid()::text` or consistent id style with platform.
6. Apply migration; verify codegen can parse columns for upcoming YAML.

## Verify (stop gate)

- [ ] `node scripts/db-migrate.mjs --dir=apps/subhub --check` passes
- [ ] Tables exist in `psql \dt`
- [ ] [`../../STATUS.md`](../../STATUS.md) → [11-contact-surfaces.md](./11-contact-surfaces.md)

## Out of scope

- Surface YAML, DAL, UI

## Reference

- [architecture.md](../architecture.md)
