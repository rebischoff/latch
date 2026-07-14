# Migration 060 — spec threshold presets + bucket ranges

> **Status:** Applied (task **37ae**, 2026-07-12). **Superseded:** preset tables/FKs dropped by [071](./071-drop-threshold-presets-plan.md) / **41ao**. Numeric `value_number_max` retained.
> **Task:** [37ae](../tasks/37ae-spec-threshold-presets-ddl.md) · **Decision:** [spec threshold presets + numeric bucket ranges](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12).

## Goal

Add catalog-owned **threshold presets** (`spec_threshold_preset` + `spec_threshold_preset_option`) and wire estimate bucket rows to reference them. Activate `value_number_max` on condition/line spec buckets for numeric interval overlap (T3). No change to part authoring (`manufacturer_part_spec`).

## DDL (sketch)

```sql
CREATE TABLE spec_threshold_preset (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_def_id      UUID NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  value_number     NUMERIC,
  value_number_max NUMERIC
);

CREATE TABLE spec_threshold_preset_option (
  preset_id      UUID NOT NULL REFERENCES spec_threshold_preset (id) ON DELETE CASCADE,
  spec_option_id UUID NOT NULL REFERENCES spec_option (id) ON DELETE RESTRICT,
  PRIMARY KEY (preset_id, spec_option_id)
);

ALTER TABLE estimate_condition_spec
  ADD COLUMN spec_threshold_preset_id UUID
    REFERENCES spec_threshold_preset (id) ON DELETE RESTRICT;

ALTER TABLE estimate_line_spec
  ADD COLUMN spec_threshold_preset_id UUID
    REFERENCES spec_threshold_preset (id) ON DELETE RESTRICT;
```

## Data migration

| Situation | Action |
|-----------|--------|
| Existing bucket rows (`estimate_condition_spec`, `estimate_line_spec`) | **`spec_threshold_preset_id`** stays null. **Point-only** rows (`value_number` set, `value_number_max` null) **backfilled in 061** (`value_number_max = value_number`) before 37ag matcher ships — see [T3 amendment](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12). |
| `value_number_max` on buckets | Column exists (054); semantics activate in matcher (37ag); legacy point rows normalized in **061** |
| Preset tables | Empty at apply |

## App / DAL constraints (not DB CHECK)

| Rule | Enforced in |
|------|-------------|
| **T6** mutual exclusion — at most one of `spec_threshold_preset_id`, `spec_option_id`, numeric pair per bucket row | DAL write path (37ag) |
| **T2** enum preset non-empty option set | DAL on preset write (37af) |
| **T8** preset shape matches `spec_def.value_type` | DAL on preset write (37af) |
| **T9** delete guards for in-use presets / options | DAL before DELETE (37af/37ag) |

No DB CHECK on mutual exclusion — combinations are rejected at write time; cheap to express in Zod/DAL, awkward as a single CHECK across nullable columns.

## App breakage

| Area | Until 37af–37ah ship |
|------|----------------------|
| Catalog Specs Details popover | No preset authoring UI |
| Estimate C panel | No preset chips; buckets behave as today (point enum / number) |
| Part matcher | Ignores `value_number_max` and `spec_threshold_preset_id` until 37ag |

## Rollback

```sql
ALTER TABLE estimate_line_spec DROP COLUMN IF EXISTS spec_threshold_preset_id;
ALTER TABLE estimate_condition_spec DROP COLUMN IF EXISTS spec_threshold_preset_id;
DROP TABLE IF EXISTS spec_threshold_preset_option;
DROP TABLE IF EXISTS spec_threshold_preset;
```

Safe if no production preset rows or bucket FK references.

## Verify

- [x] `060_spec_threshold_presets.sql` applies on dev
- [x] `061_bucket_point_normalize.sql` authored (37ag)
- [x] Existing point-only bucket rows unchanged at 060 apply; normalized to `[v,v]` at 061
- [x] `codegen --check` green (codegen does not read DBML; run for unrelated drift)
