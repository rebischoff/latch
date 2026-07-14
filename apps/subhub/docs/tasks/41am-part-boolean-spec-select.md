# 41am — Part boolean spec Select (Specs tab)

> **Status:** Complete (2026-07-13). Next: [41ao](./41ao-drop-threshold-presets.md) or [37h](./37a-category-scope-decision-dbml-migration.md) (or walkthrough W2b).

## Problem

Boolean compatibility specs on `part_detail` used a `Checkbox`, which conflated `null` (omit row / V5 wildcard) with `false` and did not match other spec pickers (enum Select with `allowClear`).

## Goal

Render boolean `spec_def` rows as a single-select `Select` with options **True** / **False**; clear → `null` (omit row on save). Matcher, PATCH expand, and LF seed omit-row behavior unchanged.

**Not in scope:** Reseeding non-LF parts to explicit `false`; matcher / V5 changes; estimate C panel (41al).

---

## Implementation

| File | Change |
|------|--------|
| `components/parts/PartSpecsField.tsx` | Replace boolean `Checkbox` with `Select` + `BOOLEAN_SPEC_OPTIONS`; read-only keeps Yes / No / — |
| `docs/surface-specs/part.md` | Spec · Value boolean = Select (True/False, clear → N/A) |

---

## Verify (stop gate)

- [x] Part detail → Specs → Low Frequency is a Select (True / False)
- [x] Clear → `value_boolean` null; save omits row; reload shows empty Select
- [x] True / False round-trip on save
- [x] Enum / number controls unchanged
- [x] STATUS updated
