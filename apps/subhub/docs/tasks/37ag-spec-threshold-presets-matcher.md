# 37ag — Spec threshold presets (matcher + bucket DAL)

> **Status:** Complete (2026-07-12). Prerequisite: [37ae](./37ae-spec-threshold-presets-ddl.md). Next: [37ah](./37ah-spec-threshold-presets-estimate-ui.md).
>
> **Decision:** [T3–T7](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12). **Touches:** part resolver, bucket load/merge/write, estimate descriptors.

## Problem

Matcher still does point-in-band for numbers and single-option enum only. Buckets do not load/write `value_number_max` or `spec_threshold_preset_id`.

## Locked summary

| # | Choice |
|---|--------|
| **T3** | Interval overlap on number buckets; legacy point-only → `[v,v]` via migration 061 |
| **T4** | Enum preset = set membership |
| **T5–T6** | Persist `spec_threshold_preset_id`; mutual exclusion on write |
| **T7** | Number “is set” if either bound non-null |
| **T8b** | Bucket bounds canonical in DB; display in estimate forms |
| **T8c** | Full read-only `presets[]` on each estimate spec template row |
| **T8d** | `estimate_line_spec` load + write parity with condition specs |

## Step 0 — Migration `061_bucket_point_normalize.sql`

Backfill legacy point-only bucket rows before matcher ships (amends [060 plan](../migrations/060-spec-threshold-presets-plan.md)):

```sql
UPDATE estimate_condition_spec
SET value_number_max = value_number
WHERE value_number IS NOT NULL
  AND value_number_max IS NULL
  AND spec_threshold_preset_id IS NULL;

UPDATE estimate_line_spec
SET value_number_max = value_number
WHERE value_number IS NOT NULL
  AND value_number_max IS NULL
  AND spec_threshold_preset_id IS NULL;
```

### Verify

- [x] Idempotent re-run; HVAC-style exact buckets become `[v, v]`

## Step 1 — Shared match helper

Extract / extend matching in e.g. `lib/catalog/spec-match.ts` (or keep in `estimate-part-resolver.ts` if extraction is overkill):

- Enum option + enum preset
- Number overlap (incl. one-sided bounds + exact `min = max`)
- Expand preset → option set / numeric bounds before compare

### Verify

- [x] Tests: `≥135` matches part `[150,185]`; old HVAC point matrix still passes
- [x] Tests: Candela High preset matches part with `{135,150,177}`

## Step 2 — Bucket pipeline

| File | Action |
|------|--------|
| `lib/estimates/repository/estimate-bucket-specs.ts` | Load `value_number_max`, `spec_threshold_preset_id`; blank helper |
| `lib/estimates/estimate-bucket-specs-form.ts` | `isBucketSpecValueSet` per T7 |
| `lib/estimates/repository/estimate-conditions.ts` | Hydrate presets on spec template rows |
| `lib/estimates/repository/estimate-conditions-write.ts` | Persist new columns; reject illegal combos |
| `lib/estimates/descriptors/estimate-detail.ts` | Patch/read schemas |
| `lib/estimates/repository/estimate-part-resolver.ts` | Call new matcher |
| Line-spec write path | Same columns + T6 validation on `estimate_line_spec` (T8d) |

### Verify

- [x] Unit + form blank/set tests
- [x] Line-spec path loads/writes same columns (parity even if UI deferred)

## Stop gate

- [x] All verifies `[x]`
- [x] No UI requirement in this task — 37ah consumes the API
