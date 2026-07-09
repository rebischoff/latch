# 37t — Spec def type round-trip: preserve Details before save

> **Status:** Complete (2026-07-08). Next: [37h](./37a-category-scope-decision-dbml-migration.md) (job `site_zone_id` FK renames) or manual smoke `/parts/[id]?tab=specs` after 37u.
>
> **Found during:** 37s manual smoke (Test 5). **Touches:** `ItemSpecDefinitionsField.tsx` Type `onChange`.

## Problem

On scope **Specs** tab, loaded defs show correct Details (enum options, number unit/decimals). If the user changes **Type** away and back **without saving**, Details are wiped in the form. A full page reload restores server values.

**Cause:** Type `onChange` eagerly clears `options` when leaving `enum` and `unit_id` / `decimal_places` when leaving `number` (37s Step 2 verify). No stash/restore on round-trip.

**Not a 37s regression** — forward clearing was intentional; round-trip preservation was out of scope.

## Locked deliverables

| # | Deliverable |
|---|-------------|
| T1 | Round-trip before save: switch `enum` → other → `enum` restores prior `options`; `number` → other → `number` restores `unit_id` + `decimal_places` |
| T2 | Forward type change still valid: saved payload must not send orphaned options on `number`/`boolean` or unit/decimals on non-`number` (server `assertSpecDefinitionShape` unchanged) |
| T3 | Save after round-trip persists restored Details; reload matches |
| T4 | Unit test or component-level test for stash/restore behavior |

## Approach (pick one)

**A — Per-type snapshots (recommended):** On Type change, stash outgoing type’s Details fields in a ref/map keyed by `spec_definitions.${index}` + type; on switch back, restore from stash. Clear stash for a type only on successful save or row remove.

**B — Defer clearing until save:** Remove eager `setValue` clears from Type `onChange`; rely on `toPatchBody` / `assertSpecDefinitionShape` to omit invalid fields per `value_type` at PATCH time. Confirm UI doesn’t show wrong popover content for stale fields (Details cell already branches on `useWatch` `value_type`).

### Decision: Approach B (2026-07-08)

**Choice:** B — defer clearing until save.

**Rationale:** Details cell already branches on `value_type`, so stale form fields are not shown. `toSpecDefinitionPatchRow` strips options for non-`enum` and unit/dp for non-`number` so PATCH still satisfies `assertSpecDefinitionShape`. Avoids stash lifecycle (save / row remove / index shift).

## Files

| File | Action |
|------|--------|
| `components/catalog/ItemSpecDefinitionsField.tsx` | Remove eager Type `onChange` clears |
| `lib/catalog/item-spec-definitions-form.ts` | `toSpecDefinitionPatchRow` — per-type strip |
| `components/catalog/ItemDetailForm.tsx` | `toPatchBody` uses `toSpecDefinitionPatchRow` |
| `lib/catalog/item-spec-definitions-form.test.ts` | Round-trip + forward-strip unit tests |

## Verify (stop gate)

- [x] Load scope def with enum options → Type `boolean` → Type `enum` → options visible again (no reload)
- [x] Load scope def with number unit/dp → Type `enum` → Type `number` → unit/dp visible again (no reload)
- [x] Change type forward and **Save** without round-trip — server row has no invalid cross-type fields
- [x] Build green

**Done when:** type round-trip before save preserves loaded Details; save still enforces per-type shape.

**Related (separate):** enum option **reorder** in popover ([37q](./37q-spec-units-defs-ui.md) “if cheap”); part Specs UX ([37u](./37u-part-leaf-links-specs-ui.md)).
