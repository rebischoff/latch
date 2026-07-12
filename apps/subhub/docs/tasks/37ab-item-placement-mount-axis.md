# 37ab — Item placement + mount axis override

> **Status:** **Superseded / reverted (2026-07-11)** — never progressed past Step 3; Step 4 stayed blocked on D3. Reverted by [37ac](./37ac-item-placement-mount-axis-revert.md) — see [reverted decision](../decisions/catalog.md#decision-item-placement--mount-axis-override--reverted-leaf-duplication-instead-2026-07-11). **Do not resume this task.** Content below is historical.
>
> **Decisions (historical — superseded):** [item labor axis override, M1–M7](../decisions/catalog.md#decision-item-labor-axis-override--single-spec-axis-no-compound-2026-07-11) · [item placement — multi-location browse tree, L1–L6](../decisions/catalog.md#decision-item-placement--multi-location-browse-tree-decoupled-from-cost-resolution-2026-07-11)

## Problem

Some device families (e.g. Fire Alarm notification appliances) need different install labor — and sometimes different freight/incidental/markup — depending on **mount** (ceiling / wall / outdoor), while name, part pool, and quotability stay identical across mounts. The catalog tree has no way to represent this today without either duplicating leaves per mount value or giving a leaf multiple structural parents, which reopens ancestry ambiguity `resolveRate` depends on. See the linked decisions for the full rejected-alternatives analysis (leaf duplication, `complexity_factor` misuse, multi-parent load-bearing ancestry).

## Locked summary (do not re-litigate)

| # | Choice |
|---|--------|
| **M1–M6** | `commercial_axis` flag on `spec_def`; `item_labor_phase.variant_spec_option_id`; axis-match-else-base resolution; single axis only; no new estimate UI |
| **M7** | Same override pattern extended to freight/incidental/markup via new `item_cost_override` table |
| **L1–L2** | `item_placement(item_id, parent_id)` many-to-many, decoupled from `item.parent_id`; targets constrained to same-scope-root category nodes |
| **L3–L4** | "Parent Items" multi-select on `ItemDetailForm`; estimate picker unions placement edges via synthetic node keys |
| **L5–L6** | Category `implies_spec_option_id` auto-seeds `estimate_line_spec` on pick; placement table never read by cost/part resolution |

## Step 1 — Migration

| Action |
|--------|
| `commercial_axis boolean not null default false` on `spec_def` |
| `variant_spec_option_id` nullable FK → `spec_option` on `item_labor_phase` |
| New `item_cost_override(item_id, variant_spec_option_id NULL, freight_rate_type_id, incidental_rate_type_id, markup_type_id)` |
| New `item_placement(item_id, parent_id)` composite PK |
| `implies_spec_option_id` nullable FK → `spec_option` on `item` (category nodes only, DAL-guarded) |
| Amend [`current.dbml`](../schema/current.dbml) |

### Verify (Step 1)

- [x] Migration applies clean on dev
- [x] `current.dbml` amended; `codegen --check` green

## Step 2 — DAL / resolver

| Action |
|--------|
| Labor-phase lookup: per-phase variant match (M3) — self-level atomic group, axis match else base |
| Freight/incidental/markup lookup: same variant match against `item_cost_override` (M7) |
| DAL guard: reject `variant_spec_option_id` / override rows whose def isn't `commercial_axis` or isn't in the item's `item_spec_participation` |
| `item_placement` CRUD — write guard: target `node_type = 'category'`, same scope root as canonical `parent_id` (L2) |
| `useEstimateItemPicker` — union `item.parent_id` edges with `item_placement` edges; synthetic node key `place:<item_id>:<parent_id>` |

### Verify (Step 2)

- [x] Unit tests: variant resolution (labor + cost FKs), fallback to base row, ancestry fallback when leaf has no own rows at all
- [x] Unit tests: `item_placement` write guard rejects cross-scope-root and non-category targets
- [x] Picker returns the leaf at every placement position plus its canonical-parent position

## Step 3 — Catalog UI

| Action |
|--------|
| `ItemCommercialFields` — "When" column for `variant_spec_option_id` (labor) and new cost-override rows (M7), mirroring the existing inherit-checkbox pattern |
| `ItemDetailForm` — new "Parent Items" multi-select TreeSelect (create + detail); does not touch the existing drag/drop `parent_id` mechanism |
| Category node form — new "Implies spec value" field (L5) |
| `spec_def` admin UI — `commercial_axis` toggle |

### Verify (Step 3)

- [x] "Parent Items" writes `item_placement`; drag/drop still only writes `parent_id`
- [x] Category form "Implies spec value" saves `implies_spec_option_id`
- [x] Labor/cost-override "When" column round-trips through save
- [x] Spec definitions "Commercial axis" toggle wired to `commercial_axis`
- [x] Estimate `ItemCell` decodes placement picker values via `decodeItemPickerValue` (seed deferred — Step 4)

## Step 4 — Estimate picker + line seed

| Action |
|--------|
| `estimate-line-cells.tsx` `TreeSelect` — decode synthetic node key; set `item_id` unchanged; when a placement branch was used, call new seed helper |
| Seed helper — reads clicked branch's `implies_spec_option_id`; writes an `estimate_line_spec` row for that def on the new line |
| **Hard dependency:** requires `estimate_line_spec` write/UI ([D3](../decisions/catalog.md#decision-specs-narrow-parts-separate-from-rates-2026-07-04), deferred v1) to land first — this step cannot ship before that gap closes |

### Verify (Step 4)

- [ ] Picking a leaf through a placement branch seeds the correct line-level spec value
- [ ] Picking the same leaf via its canonical parent (no placement involved) leaves the line's spec value unset, as today

## Step 5 — Stop gate

| Action |
|--------|
| `npm run test` — subhub unit tests green |
| Update STATUS + task index |

### Verify (Step 5)

- [x] Tests pass (`apps/subhub` unit suite — 241)
- [x] STATUS + index updated (Step 4 remains blocked on D3)
