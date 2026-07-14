# Migration 064 — drop `item_spec_participation`

> **Status:** Plan (2026-07-12). **Task:** [37ai](../tasks/37ai-spec-participation-removal.md) · **Decision:** [spec participation removed (V1–V8)](../decisions/catalog.md#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12).

## Goal

Drop `item_spec_participation` outright. Nothing replaces it — an item's effective spec set becomes a pure computation (`spec_def WHERE scope_root_item_id = <item's root>`), not a stored relationship. No new table, no new column anywhere.

## DDL

```sql
DROP TABLE IF EXISTS item_spec_participation;
```

That's the entire migration. No FK cleanup elsewhere — `item_spec_participation` was a leaf table (nothing else references it).

## Data migration

| Situation | Action |
|-----------|--------|
| Existing `item_spec_participation` rows | **Discarded, not backfilled anywhere.** Nothing downstream reads them after this ships — [V1–V8](../decisions/catalog.md#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12) replaces the concept, not the storage. |
| Existing `manufacturer_part_spec` rows | **Untouched.** Moving from participation (narrow) to full scope-root namespace (broad) only ever *widens* what's in-namespace for a part — no row that was previously valid becomes invalid ([V7](../decisions/catalog.md#decision-spec-participation-removed--narrow-by-scope-root-namespace-part-row-presence-is-the-filter-2026-07-12)). |
| `spec_def` / `spec_option` | Untouched — namespace-scoping (37o) is unaffected by this migration. (`spec_threshold_preset*` later dropped by [071](./071-drop-threshold-presets-plan.md) / **41ao**.) |

**No backfill script needed** (unlike [046](../tasks/37o-spec-participation-flatten.md#step-2--migration-046_spec_participation_flattensql)'s one-off participation backfill) — this migration only removes storage that nothing will read going forward. Apply **after** the DAL/matcher code (37ai steps 2–4) stops querying `item_spec_participation`, so there's no window where running code 500s on a missing table. Order: ship code first (reads become namespace-only), then run `064`, matching the "widen, then drop" safety pattern.

## App / DAL constraints (not DB CHECK)

| Rule | Enforced in |
|------|-------------|
| Part `part_specs` writable defs = namespace union, not participation | `lib/parts/repository/part-specs.ts` (37ai step 3) |
| Estimate line/bucket effective defs = item's scope-root namespace | `lib/estimates/repository/estimate-part-resolver.ts` (37ai step 3) |
| Zero `manufacturer_part_spec` rows for an in-namespace def = wildcard pass, not fail | `lib/catalog/spec-match.ts` (37ai step 3) |
| No `spec_participation` Field / PATCH body key anywhere | `lib/catalog/descriptors/item-detail.ts`, `modules/catalog/item_detail.surface.yaml` (37ai step 4) |

## App breakage if migration runs before code ships

| Area | Symptom |
|------|---------|
| `item-detail.ts` `loadItemSpecParticipation` / `loadParticipationIds` | Query against dropped table — `42P01 relation does not exist` |
| `item-spec-participation-write.ts` | Same — PATCH `spec_participation` would 500 |
| `part-specs.ts` / `estimate-part-resolver.ts` unionEffectiveForItems | Same |

**Do not apply `064` until 37ai steps 2–4 (DAL swap to namespace queries) are merged** — this migration is intentionally the *last* SQL step in the task, not the first.

## Rollback

```sql
CREATE TABLE item_spec_participation (
  item_id      text NOT NULL REFERENCES item (id) ON DELETE CASCADE,
  spec_def_id  uuid NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  sort_order   int NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, spec_def_id)
);
```

Restores the table shape but **not the data** — original participation rows are gone once `064` runs. Only meaningful as an emergency schema rollback paired with reverting the DAL/matcher code in the same rollback; there is no partial-rollback path that keeps the namespace-based matcher and the table simultaneously (the table would just sit empty and unused).

## Verify

- [x] `064_drop_item_spec_participation.sql` applies clean on dev
- [x] Applied **after** DAL/matcher code no longer references `item_spec_participation` (steps 2–4 merged first)
- [x] `current.dbml` already at target state (no `item_spec_participation` table/Ref) — confirm no drift post-apply
- [x] `codegen --check` green (YAML no longer lists `item_spec_participation` in `tables:`)
