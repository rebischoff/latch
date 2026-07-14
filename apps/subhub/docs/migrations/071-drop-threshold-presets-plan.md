# Migration 071 — Drop threshold presets

> **Status:** Applied with task **41ao** (2026-07-13).
> **Prerequisite:** `070_candela_low_high.sql`.
> **Rollback sketch:** reverse of `060_spec_threshold_presets.sql` (recreate tables + FK columns). Prefer restore from backup if presets matter.

## Goal

Remove `spec_threshold_preset` / `spec_threshold_preset_option` and `spec_threshold_preset_id` from bucket tables. Numeric filters continue via `value_number` / `value_number_max` interval overlap.

## Steps

1. Null out any remaining preset-backed bucket rows (clears filters; does not invent option/numeric replacements).
2. Drop preset FK indexes + columns on `estimate_condition_spec` / `estimate_line_spec`.
3. Drop junction then preset tables.

## Related

- Task: [`../tasks/41ao-drop-threshold-presets.md`](../tasks/41ao-drop-threshold-presets.md)
- Introduced: [`060-spec-threshold-presets-plan.md`](./060-spec-threshold-presets-plan.md)
