# 10 — Party migration

> **Status:** Complete (2026-06-13). Next: [11-contact-surfaces.md](./11-contact-surfaces.md).

## Goal

Business DDL for party spine and employee link.

## Prerequisites

Slice 0 complete ([09-dev-roles-seed.md](./09-dev-roles-seed.md)).

## Files

| File | Action |
|------|--------|
| `migrations/016_party.sql` | **Create** — `party`, `party_role`, `party_phone`, `party_email`, `employee` |
| `migrations/017_party_dev_seed.sql` | **Create** — optional dev fixtures |

> **Note:** Platform migrations `014`–`015` (`latch_users` identity) shipped before business DDL; party tables use `016`–`017`.

## Steps

1. `party`: `id TEXT PK`, `kind`, `display_name`, `legal_name`, `notes`, `created_at` / `updated_at` (business-anchor convenience — list sort; mutation history stays in `latch_audit`). Do **not** add `created_by` until row-scope needs it ([decisions.md](../decisions.md#decision-row-timestamps-vs-audit--ddl-vs-surface-fields-2026-06-13)).
2. `party_role`: `(party_id, role)` unique; check constraint on role enum.
3. `party_phone` / `party_email`: FK `party_id ON DELETE CASCADE`, `is_primary`, sort order.
4. `employee`: `party_id` PK/FK, `latch_user_id` nullable FK → `latch_users`.
5. Use `gen_random_uuid()::text` or consistent id style with platform.
6. Apply migration; verify codegen can parse columns for upcoming YAML.

## Verify (stop gate)

- [x] `node scripts/db-migrate.mjs --dir=apps/subhub --check` passes
- [x] Tables exist in `psql \dt`
- [x] [`../../STATUS.md`](../../STATUS.md) → [11-contact-surfaces.md](./11-contact-surfaces.md)

## Out of scope

- Surface YAML, DAL, UI

## Reference

- [architecture.md](../architecture.md)
