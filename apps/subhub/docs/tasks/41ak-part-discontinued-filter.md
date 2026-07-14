# 41ak — Part discontinued filter

> **Status:** Complete (2026-07-13). Next: [37h](./37a-category-scope-decision-dbml-migration.md) (or W2b).

## Problem

When all configuration specs are set, multiple parts can still match — including EOL MPNs that should not appear in estimate Part Select / costing.

## Goal

Add `manufacturer_part.discontinued` and a condition-level **Include discontinued parts** toggle (C panel general area, default off). Same filter in picker, preview, and material resolver.

**Not in scope:** seed marking EOL MPNs; part list badge/filter; preferred-part tie-break.

---

## Locked decisions

| # | Choice |
|---|--------|
| Default | Hide discontinued in pick + costing |
| Toggle | C panel commercial knobs (not a `spec_def`) |
| Persist | `estimate_condition.include_discontinued` |
| Already-picked | As-is — unlocked lines re-resolve when knob changes |
| Authoring | `part_detail` profile checkbox |

---

## Implementation

| Layer | Detail |
|-------|--------|
| Migration **069** | `manufacturer_part.discontinued`, `estimate_condition.include_discontinued` |
| Resolver | `filterPartsForItem` / `resolveLineMaterial` SQL filter |
| Picker | POST `condition_draft.include_discontinued` + DB fallback |
| Preview | Draft + `RecalcContextOverrides.includeDiscontinued` |
| UI | C panel checkbox; `PartDetailForm` discontinued |

---

## Verify (stop gate)

- [x] Migration `069` + DBML + `024` CREATE parity for codegen
- [x] Discontinued excluded by default; included when condition toggle on
- [x] Draft toggle refetches Part Select without Save
- [x] `part_detail` profile round-trip for `discontinued`
- [x] Tests green; STATUS updated
