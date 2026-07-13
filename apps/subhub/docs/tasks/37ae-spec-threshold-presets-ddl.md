# 37ae — Spec threshold presets + bucket ranges (DDL)

> **Status:** Complete (2026-07-12). Next: [37af](./37af-spec-threshold-presets-catalog-ui.md).
>
> **Decision:** [spec threshold presets + numeric bucket ranges (A1–T10)](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12). **Amends:** N4/N5 (bucket side). **Epic:** 37ae → 37af → 37ag → 37ah.

## Problem

Bucket rows have unused `value_number_max`; there is no place to store High/Low-style presets. Schema must land before catalog UI and matcher work.

## Locked summary (do not re-litigate)

| # | Choice |
|---|--------|
| **A1** | Presets authored on scope **Specs** tab Details popover only |
| **T1–T2** | `spec_threshold_preset` + `spec_threshold_preset_option` |
| **T3/T5** | Activate bucket `value_number_max`; add `spec_threshold_preset_id` on condition/line specs |
| **T9** | Delete guards for in-use presets/options |

## Step 1 — Decision already locked

Confirm `catalog.md` + `decisions/README.md` rows; no re-open of A1–T10.

### Verify

- [x] Decision status **Locked**; README index points at this task
- [x] This task + 37af–37ah filed; linked from `01-task-index.md` and `STATUS.md`

## Step 2 — DBML + migration plan

| File | Action |
|------|--------|
| `docs/schema/current.dbml` | Add `spec_threshold_preset`, `spec_threshold_preset_option`; add `spec_threshold_preset_id` on `estimate_condition_spec` / `estimate_line_spec`; change `value_number_max` note from “unused” to active bucket upper bound |
| `docs/migrations/060-spec-threshold-presets-plan.md` | Author plan (idempotent notes, backfill none) |

### Verify

- [x] DBML Ref: lines for new FKs
- [x] Plan doc lists CHECK / mutual-exclusion as app DAL (not DB CHECK unless cheap)

## Step 3 — Migration `060_spec_threshold_presets.sql`

```sql
-- sketch
CREATE TABLE spec_threshold_preset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_def_id uuid NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  value_number numeric,      -- number defs only
  value_number_max numeric   -- number defs only
);

CREATE TABLE spec_threshold_preset_option (
  preset_id uuid NOT NULL REFERENCES spec_threshold_preset (id) ON DELETE CASCADE,
  spec_option_id uuid NOT NULL REFERENCES spec_option (id) ON DELETE RESTRICT,
  PRIMARY KEY (preset_id, spec_option_id)
);

ALTER TABLE estimate_condition_spec
  ADD COLUMN spec_threshold_preset_id uuid
    REFERENCES spec_threshold_preset (id) ON DELETE RESTRICT;

ALTER TABLE estimate_line_spec
  ADD COLUMN spec_threshold_preset_id uuid
    REFERENCES spec_threshold_preset (id) ON DELETE RESTRICT;
```

### Verify

- [x] Migration applies clean on dev
- [x] Existing point-only bucket rows unchanged
- [x] `codegen --check` green after DBML sync (if codegen reads DBML)

## Stop gate

- [x] All Step 1–3 verifies `[x]`
- [x] STATUS **Right now** → [37af](./37af-spec-threshold-presets-catalog-ui.md)
