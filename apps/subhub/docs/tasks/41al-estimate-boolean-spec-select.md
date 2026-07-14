# 41al — Estimate boolean spec Select (C panel)

> **Status:** Complete (2026-07-13). Next: [37h](./37a-category-scope-decision-dbml-migration.md) (or Candela / enum preset UX follow-on).

## Problem

Boolean spec filters on the estimate Configuration panel used a `Switch`, which conflated `null` (no filter) with `false` and did not match other spec pickers (enum Select with `allowClear`).

## Goal

Render boolean `spec_def` rows as a single-select `Select` with options **True** / **False**; clear → `null` (no filter). Matcher, seed, and V5 wildcard unchanged.

**Not in scope:** Candela preset chips / multi-select; exclusive LF-only matching; part Specs checkbox UX.

---

## Implementation

| File | Change |
|------|--------|
| `components/estimates/EstimateScopeSpecFields.tsx` | Replace boolean `Switch` with `Select` + `BOOLEAN_SPEC_OPTIONS`; read-only/inherit uses disabled Select |

---

## Verify (stop gate)

- [x] Fire Alarm condition → Configuration → Low Frequency is a Select (True / False)
- [x] Clear → `value_boolean` null (no filter placeholder)
- [x] True / False round-trip on save
- [x] Child inherit shows disabled Select until Override
- [x] STATUS updated

**Smoke (2026-07-13):** Low Frequency Select replaces Switch; labels `True` / `False`; `allowClear` restores blank bucket.
