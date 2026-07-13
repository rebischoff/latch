# 37ah — Spec threshold presets (estimate C panel UI)

> **Status:** Complete (2026-07-12). Prerequisites: [37af](./37af-spec-threshold-presets-catalog-ui.md), [37ag](./37ag-spec-threshold-presets-matcher.md). Next: [37h](./37a-category-scope-decision-dbml-migration.md) (job FK renames — see [01-task-index](./01-task-index.md#category-scope--tasks-37a37h)).
>
> **Decision:** [A2](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12). **Touches:** `EstimateScopeSpecFields` (+ form types / templates). **Does not author presets** — consume only.

## Problem

Estimators need High/Low (and number min/max) on the C panel once catalog + matcher exist.

## Locked summary

| # | Choice |
|---|--------|
| **A2** | C panel uses presets; Custom keeps raw option / range |
| Enum | Single-select preset chips; Custom → option Select |
| Number | Preset chips + Min / Max inputs; either bound alone OK |
| Inherit | Existing override checkbox unchanged |

## Step 1 — Form model

| File | Action |
|------|--------|
| `components/estimates/estimate-line-tree.ts` | `value_number_max`, `spec_threshold_preset_id`, nested `presets[]` on condition spec rows |
| Spec templates | Include presets when seeding new conditions from catalog |

### Verify

- [x] New Fire Alarm condition shows Candela presets without extra fetch (if hydrated on estimate GET)

## Step 2 — C panel controls

| File | Action |
|------|--------|
| `components/estimates/EstimateScopeSpecFields.tsx` | Type-aware preset + Custom UI; clear → blank filter |

### Verify

- [x] Manual: set High → part picker narrows; clear → all candidates return
- [x] Inherited child shows preset label read-only until Override

## Step 3 — Optional seed (same task or follow-on snippet)

If Candela not in catalog yet: add enum + High/Low presets + a few `manufacturer_part_spec` rows in a small migration/seed under Fire Alarm Notification leaves — enough for smoke.

### Verify

- [x] Smoke checklist checked in STATUS notes (or this file)

**Smoke (2026-07-12):** migration `062_candela_threshold_presets_seed.sql` — Candela enum on Notification Appliances, High/Low presets, part specs on P2RL/P2RLED/P2RL-LF/HRL. After migrate: Add Fire Alarm root condition → C panel shows Candela High/Low chips; pick High → part picker narrows; clear chip → all candidates; child inherits preset label until Override.

## Stop gate

- [x] All verifies `[x]`
- [x] STATUS **Right now** returns to [37h](./37a-category-scope-decision-dbml-migration.md) (or next backlog) when epic complete
