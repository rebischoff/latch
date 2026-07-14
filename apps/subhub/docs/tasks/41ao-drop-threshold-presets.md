# 41ao — Drop threshold presets + estimate number popover

> **Status:** Complete (2026-07-13). Next: [37h](./37a-category-scope-decision-dbml-migration.md).

## Problem

Threshold presets (catalog High/Low option sets, preset chips on estimate C panel) add indirection. Estimate number filters use inline dual inputs while parts use a min/max popover.

## Goal

Remove preset tables, FKs, catalog editor, matcher expansion, and `presets[]` hydration. Keep numeric bucket `value_number` / `value_number_max` interval overlap. Share min/max popover between parts and estimate C panel.

**Prerequisite:** [41an](./41an-candela-low-high.md) (Candela no longer uses Candela-specific presets).

---

## Implementation

| Area | Change |
|------|--------|
| Migration **071** | Drop `spec_threshold_preset*` + bucket `spec_threshold_preset_id` |
| Catalog | No `presets[]` on defs DTO/patch; Details = options or unit/dp only |
| Matcher | Direct option / numeric overlap (no preset expansion) |
| Estimate C | `SpecNumberValuePopover` for number filters |
| Parts | Same shared popover |

---

## Verify (stop gate)

- [x] Scope Specs Details — no Presets section on enum/number defs
- [x] Estimate C — number defs use min/max popover (no chips)
- [x] Parts Specs — number popover unchanged behavior
- [x] Bucket write rejects preset fields; interval overlap match still works
- [x] Migrate clean; unit tests green
- [x] STATUS updated
