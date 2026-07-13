# 37af — Spec threshold presets (catalog authoring UI)

> **Status:** Complete (2026-07-12). Next: [37ag](./37ag-spec-threshold-presets-matcher.md) (can parallel) / [37ah](./37ah-spec-threshold-presets-estimate-ui.md).
>
> **Decision:** [A1 / A2 / T1–T2 / T9](../decisions/catalog.md#decision-spec-threshold-presets--numeric-bucket-ranges-2026-07-12). **Touches:** `item_detail.spec_definitions` only.

## Problem

Presets have nowhere to be edited. Locked authoring surface is the **scope Specs tab → Details popover** next to options / unit — not a new Surface.

## Locked summary

| # | Choice |
|---|--------|
| **A1** | Edit on `ItemSpecDefinitionsField` Details popover |
| Enum | Presets = label + multi-select of this def’s options |
| Number | Presets = label + min / max (def display unit → canonical on write) |
| Delete | Block when any `estimate_*_spec.spec_threshold_preset_id` references |

## Step 1 — Surface / DTO

| File | Action |
|------|--------|
| `docs/surface-specs/item.md` | Document `presets[]` under `spec_definitions` Details |
| `lib/catalog/descriptors/item-detail.ts` | Nested presets on def rows (read + patch) |
| `modules/catalog/item_detail.surface.yaml` | Only if a new logical Field is required — prefer nest under `spec_definitions` |

### Verify

- [x] DTO round-trips `presets` on scope GET/PATCH
- [x] Leaf / category nodes still omit `spec_definitions`

## Step 2 — DAL write

| File | Action |
|------|--------|
| `lib/catalog/repository/item-spec-definitions-write.ts` | Diff-upsert presets + option junction; validate enum membership / number bounds; delete guard |
| Tests | Empty enum set rejected; orphan option_id rejected; in-use preset delete blocked |

### Verify

- [x] Unit tests green
- [x] Option delete still blocked when used by parts **or** preset membership

## Step 3 — UI

| File | Action |
|------|--------|
| `components/catalog/ItemSpecDefinitionsField.tsx` | Presets section in Details popover (type-aware) |

### Verify

- [x] Manual: Fire Alarm Specs → Candela (or any enum) → add High/Low → Save → reload
- [x] Number def: preset with only max bound saves (`value_number` null)

## Stop gate

- [x] All verifies `[x]`
- [x] STATUS updated when epic advances
