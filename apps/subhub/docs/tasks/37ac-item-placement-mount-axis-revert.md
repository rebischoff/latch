# 37ac — Revert item placement + mount axis override (37ab)

> **Status:** Complete (2026-07-11). Next: [37h](./37a-category-scope-decision-dbml-migration.md) (job `site_zone_id` FK renames).
>
> **Decision:** [item placement + mount axis override — reverted, leaf duplication instead (R1–R6)](../decisions/catalog.md#decision-item-placement--mount-axis-override--reverted-leaf-duplication-instead-2026-07-11). **Reverts:** [37ab](./37ab-item-placement-mount-axis.md) (Steps 1–3 only shipped; Step 4 never landed). **Caution:** 37ab's diff is interleaved, uncommitted, with unrelated 37aa (dual locks + live preview) work in several shared files (`estimate-line-cells.tsx`, `estimate-line-recalc.ts`, `estimate-commercial.ts`). Do **not** blind-revert files or use `git checkout`/`git revert` on them — hand-remove only the 37ab-added pieces called out below.

## Problem

37ab added a `commercial_axis` spec flag + `variant_spec_option_id`/`item_cost_override` variant-match resolver step, plus a decoupled `item_placement` browse table, to let one leaf represent a device across multiple mount locations. Review concluded this reopened the ambiguity D1/D4 were designed to avoid, its payoff mechanism (path → `estimate_line_spec` auto-seed, L5) was hard-blocked on unshipped D3, and the accepted alternative — one item row per install location — is cheap enough at real catalog scale to prefer outright. See the [reverted decision](../decisions/catalog.md#decision-item-placement--mount-axis-override--reverted-leaf-duplication-instead-2026-07-11) for full rationale.

## Locked summary (do not re-litigate)

| # | Choice |
|---|--------|
| **R1** | Drop `item_placement`, `item_cost_override`, `spec_def.commercial_axis`, `item_labor_phase.variant_spec_option_id`, `item.implies_spec_option_id` |
| **R2** | Mount variance = separate item rows, one per install location, each with its own `parent_id` / labor phases / part links / spec participation |
| **R3** | `resolveRate` reverts to D4 exactly — self → ancestry → neutral, no axis-match step |
| **R4** | 3× authoring cost across mount-variant leaves accepted, not solved |
| **R5** | Catalog UI: drop "Parent Items", labor/cost-override "When" column, category "Implies spec value", `spec_def` "Commercial axis" toggle |
| **R6** | Estimate picker: drop synthetic `place:<item_id>:<parent_id>` keys; render `item.parent_id` edges only |

## Step 1 — Rollback migration

| Action |
|--------|
| New `058_item_placement_mount_axis_revert.sql` — prerequisite: `057` applied |
| `DROP TABLE IF EXISTS item_placement` |
| `DROP TABLE IF EXISTS item_cost_override` |
| `ALTER TABLE item DROP COLUMN IF EXISTS implies_spec_option_id` |
| `ALTER TABLE item_labor_phase DROP COLUMN IF EXISTS variant_spec_option_id` (drop `item_labor_phase_base_unique` / `item_labor_phase_variant_unique` partial indexes first, restore a plain `(item_id, labor_phase_id)` unique constraint matching pre-37ab shape) |
| `ALTER TABLE spec_def DROP COLUMN IF EXISTS commercial_axis` |
| Amend [`current.dbml`](../schema/current.dbml) — remove the `item_cost_override` / `item_placement` tables, the three columns above, and their `Ref:` lines; remove 37ab notes from `spec_def`, `item_labor_phase`, `item` table comments |

### Verify (Step 1)

- [x] Migration applies clean on dev
- [x] `current.dbml` amended; `codegen --check` green

## Step 2 — DAL / resolver

| File | Action |
|------|--------|
| `lib/estimates/repository/estimate-commercial.ts` | Remove M3/M7 variant-match branch from `resolveRate`'s labor-phase and freight/incidental/markup lookups — restore plain self-row-or-ancestor lookup, no `axisOptionId` parameter |
| `lib/estimates/repository/estimate-line-recalc.ts` | Remove `resolveAxisOptionId(commercialCatalog, bucket)` call and the `axisOptionId` argument threaded into the three `resolveRate` calls — do **not** touch the unrelated `material_locked` / preview logic in this file (37aa) |
| `lib/catalog/repository/item-picker-tree.ts` | Delete `placementNodeKey`, `parsePlacementNodeKey`, `decodeItemPickerValue`, `loadPlacementsByParent`; remove the placement-children union in `buildFromItem` — `loadItemTreeForRoot` goes back to rendering only `item.parent_id` structural children |
| `lib/catalog/repository/item-placement-write.ts` | Delete file |
| `lib/catalog/repository/item-placement-write.test.ts` | Delete file |
| `lib/catalog/item-commercial-axis-options.ts` | Delete file |
| `lib/catalog/repository/item-cost-override-write.ts` | Delete file (37ab M7 write path; omitted from original list, required by R1) |
| `lib/catalog/repository/item-write.ts` | Remove the `item_placement` in-use blocker check added for 37ab |
| `lib/catalog/repository/item-detail.ts` | Remove `item_placement` / `item_cost_override` loading (the `Promise.all` member and DTO field) |
| `lib/catalog/descriptors/item-detail.ts` | Remove `item_placement` / `item_cost_override` from readable/writable schemas, `ItemDetailRelated`, patch typing, and DTO assembly |
| `lib/catalog/stores/item-detail-create.ts` | Remove `replaceItemPlacements` call + `item_placement` field-id bookkeeping |
| `lib/catalog/stores/item-detail-store.ts` | Remove `replaceItemPlacements` call |
| `lib/catalog/item-detail-labor-phase-patch.test.ts` | Remove `item_placement` / variant-row test cases (keep unrelated labor-phase-patch cases) |
| `lib/catalog/item-spec-definitions-form.ts` (+ `.test.ts`) | Remove `commercial_axis` field wiring |

### Verify (Step 2)

- [x] `resolveRate` unit tests pass with no axis-match branch (base/ancestor only)
- [x] `item-picker-tree` returns each leaf exactly once, at its canonical `parent_id` position only
- [x] No remaining reference to `item_placement` / `item_cost_override` / `variant_spec_option_id` / `commercial_axis` / `implies_spec_option_id` outside this task's own docs

## Step 3 — Catalog UI

| File | Action |
|------|--------|
| `components/catalog/ItemDetailForm.tsx` | Remove "Parent Items" multi-select `TreeSelect` field (create + detail) |
| `components/catalog/ItemCommercialFields.tsx` | Remove the "When" column / cost-override rows added for M1/M7 — restore pre-37ab labor/cost fields |
| `components/catalog/ItemSpecDefinitionsField.tsx` | Remove "Commercial axis" toggle |
| `modules/catalog/item_detail.surface.yaml` | Remove the `item_cost_override` / `item_placement` logical Fields added for 37ab |
| Category node form | Remove "Implies spec value" field (`implies_spec_option_id`) |
| Run `npm run codegen` | Regenerate `item_detail.*.generated.ts` from the reverted YAML/DBML — do **not** hand-edit generated output |

### Verify (Step 3)

- [x] `ItemDetailForm` has no "Parent Items" field; drag/drop remains the only way to set `parent_id`
- [x] `codegen --check` green after regeneration
- [x] No orphaned imports/types referencing removed Fields

## Step 4 — Estimate picker

| File | Action |
|------|--------|
| `components/estimates/estimate-line-cells.tsx` | Remove `decodeItemPickerValue` import/usage in `ItemCell`'s `onChange` — restore direct `item_id` assignment from the raw `TreeSelect` value. Leave the surrounding live-preview (`onPreview`) and `material_locked` disable logic untouched (37aa, unrelated) |

### Verify (Step 4)

- [x] Picking an item sets `item_id` directly; no synthetic key decode step remains
- [x] 37aa live-preview and dual-lock behavior in the same file is unaffected (manual smoke: preview still fires on item change; material-locked disable still works)

## Step 5 — Stop gate

| Action |
|--------|
| `npm run test` — subhub unit suite green, no leftover 37ab-specific test files |
| `npm run codegen -- --check` |
| Update this task's Status line to Complete |
| Update [`STATUS.md`](../../STATUS.md) — clear the `37ab Step 4` blocker; drop 37ab/37ac from "Right now" |
| Update [`01-task-index.md`](./01-task-index.md) — mark 37ab row superseded, add 37ac row complete |

### Verify (Step 5)

- [x] Tests pass
- [x] Codegen check green
- [x] STATUS + task index updated
