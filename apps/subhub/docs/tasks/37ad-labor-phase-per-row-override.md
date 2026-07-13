# 37ad — Labor phase per-row override (merge across full ancestry)

> **Status:** Complete (2026-07-12). Next: [37ae](./37ae-spec-threshold-presets-ddl.md) (threshold presets epic) or [37h](./37a-category-scope-decision-dbml-migration.md) (jobs backlog).
>
> **Decision:** [labor phase per-row override — merge across full ancestry](../decisions/catalog.md#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12). **Amends:** [37l](./37l-leaf-quotable-item-model.md) ("Labor" atomic-group clause), [37n](./37n-labor-phase-inclusion.md) (N2). **Aligns with:** [37z](./37z-item-commercial-inherit-ui.md) (Z1–Z5 per-field inherit checkbox) — same inherit/override vocabulary, applied per array row instead of per scalar FK.

## Problem

Today, `resolveLaborGroup` (costing) and `resolveInheritedLaborPhases` (catalog display) both treat a node's `item_labor_phase` rows as an **atomic group**: any own row at all means the *entire* ancestor set is ignored, even for phases the node never touched. Overriding one phase's hours on a leaf silently drops every other inherited phase from that leaf's cost. The decision above replaces this with a **per-phase merge** across the full ancestry chain: a node's effective labor set is the union of its own rows and its ancestors' rows, with the nearest row per `labor_phase_id` winning.

## Locked summary (do not re-litigate)

| # | Choice |
|---|--------|
| 1 | Walk leaf → parent → … → root; first row seen per `labor_phase_id` wins; keep walking to fill any phase not yet claimed |
| 2 | One shared merge helper consumed by **both** the costing engine and the catalog display DAL — they must never disagree |
| 3 | No new schema/tombstone. Excluding an inherited phase = own override row with `hours_per_unit = 0` |
| 4 | Catalog DTO: per-row `origin` (`own` \| `inherited`) + per-row source, replacing whole-table `labor_phase_mode` / single `source_item_id`/`source_item_name` |
| 5 | Category/item authoring (who may write `item_labor_phase` rows) is unchanged — only resolution changes |
| 6 | `estimate_scope_labor_phase` / `estimate_zone_labor_phase` inclusion and job `scope_phase` seed are structurally unaffected — they keep filtering whatever the resolver returns |

## Step 1 — Decision (catalog.md)

Paste the [decision block](../decisions/catalog.md#decision-labor-phase-per-row-override--merge-across-full-ancestry-2026-07-12); amend the superseded clauses in [37l's "Labor" bullet](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) and [N2](../decisions/catalog.md#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07) with pointers.

### Verify

- [x] Decision locked in `catalog.md`; superseded clauses in 37l/37n amended with pointers
- [x] `README.md` decisions index row added
- [x] This task filed + linked from `01-task-index.md` and `STATUS.md`

---

## Step 2 — DAL merge helper (shared)

### `lib/estimates/repository/estimate-commercial.ts`

Replace `resolveLaborGroup`'s "self, else first non-empty ancestor" body with a full-chain merge:

```ts
export const resolveLaborGroup = (
  catalog: CommercialCatalog,
  itemId: string,
): ItemLaborPhaseRow[] => {
  const merged = new Map<string, ItemLaborPhaseRow>();
  for (const nodeId of walkAncestry(catalog, itemId)) {
    for (const row of catalog.laborByItem.get(nodeId) ?? []) {
      if (!merged.has(row.labor_phase_id)) {
        merged.set(row.labor_phase_id, row);
      }
    }
  }
  return Array.from(merged.values());
};
```

Return type/signature unchanged — every existing caller (`resolveFilteredLaborCost`, job win seed) keeps working against a (usually larger, more accurate) row array. `laborCostForItem`/`selfRate`'s labor case stays self-only (unrelated — margin/self-row lookups, not the group resolve); don't touch it.

### `lib/catalog/repository/item-detail.ts`

- Replace `resolveInheritedLaborPhases` with a merge that mirrors the estimate-commercial helper but also tags **origin + source per row**:
  - `resolveResolvedLaborPhases(pool, itemId)` — walk `[itemId, ...ancestors]`; for each node's `loadItemLaborPhases` rows, claim any `labor_phase_id` not yet claimed; rows from `itemId` itself get `origin: "own"`, `source_item_id/name: null`; rows claimed from an ancestor get `origin: "inherited"` + that ancestor's id/name.
  - Keep `loadItemLaborPhases(pool, itemId)` (own rows only) unchanged — still the PATCH target and the "own rows" half of the merge.
- `ItemDetailRelated` — drop `inherited_labor_phase` / `labor_phase_mode` / `labor_phase_source_item_id` / `labor_phase_source_item_name`; add `resolved_labor_phase: ResolvedLaborPhaseRow[]` where:

  ```ts
  export type ResolvedLaborPhaseRow = ItemLaborPhaseRow & {
    origin: "own" | "inherited";
    source_item_id: string | null;
    source_item_name: string | null;
  };
  ```

- `loadItemDetailRelated` — return both `item_labor_phase` (own, for the editable rows) and `resolved_labor_phase` (merged, for display + "what would cost").

### Verify

- [x] `resolveLaborGroup` unit tests: 3-level chain where level 1 sets phase A, level 3 (root) sets phase B, leaf has no own rows → leaf resolves `{A, B}`
- [x] Leaf with own override on phase A (different hours) + no opinion on phase B → resolves `{A: own hours, B: inherited hours}`
- [x] Leaf with own row `{A, hours_per_unit: 0}` → resolves `A` present with `0` hours (not dropped, not re-inherited)
- [x] `resolveResolvedLaborPhases` tags `origin`/`source_item_id`/`source_item_name` correctly per row across 3 levels
- [x] `GET item_detail` DTO shape updated; existing "inherited" / "override" fixtures in `item-detail.test.ts`-style tests updated to new shape

---

## Step 3 — Catalog UI: per-row inherit/override

**Edit** [`item-labor-phase-ui-state.ts`](../../lib/catalog/item-labor-phase-ui-state.ts) — `resolveItemLaborPhaseUiView` (whole-table mode) is retired; the section always renders a row-per-`resolved_labor_phase` entry instead of switching between "inherited table" / "override table" / "empty state".

**Edit** [`item-labor-phase-display.ts`](../../lib/catalog/repository/item-labor-phase-display.ts) — `deriveLaborPhaseMode` retired (no more whole-table mode); if a per-row helper is useful, it derives `origin` from "does an own row exist for this `labor_phase_id`", not "does the item have any own rows at all".

**Edit** [`ItemCommercialFields.tsx`](../../components/catalog/ItemCommercialFields.tsx) `ItemLaborPhaseSection`:

| Row state | UI |
|---|---|
| `origin: "inherited"` | Read-only cells (phase / rate / hours) + small caption *"Inherited from '{source_item_name}'"*; row-level **Override** affordance seeds an editable own row from the inherited values (mirrors [Z2](../decisions/catalog.md#decision-item-commercial-margin-inherit-checkbox-2026-07-09)'s per-field inherit checkbox, applied per row) |
| `origin: "own"` | Editable cells (current `FieldArrayTable` row), including `0` hours as a valid, meaningful value (explicit exclusion) |
| No rows anywhere (own or inherited) | Existing empty state + **Add labor phase** |

- "Delete" on an own row: if an inherited row for that `labor_phase_id` still exists at the ancestor level, the row reverts to the inherited placeholder after save; otherwise the row disappears entirely.
- Add labor phase (net-new phase, no ancestor row either): unchanged — appends a blank own row.

**Spec amend** — [`item.md`](../surface-specs/item.md) row 11 (Labor phases): replace "leaf with no own rows inherits first ancestor's group" wording with per-row merge description; note explicit-zero exclusion.

### Verify

- [x] Category/leaf with 2 inherited + 1 own-override row renders all 3 correctly, own row editable, inherited rows read-only with correct per-row source captions
- [x] Override one inherited row → becomes editable own row seeded with inherited values; save persists only that row to `item_labor_phase`
- [x] Delete the only own row (ancestor still has that phase) → reverts to inherited placeholder after save + refetch
- [x] Own row with `hours_per_unit = 0` displays and saves as `0`, not treated as empty/deleted
- [x] `item.md` row 11 updated

---

## Step 4 — Surface / codegen

- [`item_detail.surface.yaml`](../../modules/catalog/item_detail.surface.yaml) — replace `inherited_labor_phase` / `labor_phase_mode` logical Fields with `resolved_labor_phase`; keep `item_labor_phase` (writable, own rows) unchanged.
- `lib/catalog/descriptors/item-detail.ts` — update DTO assembly (`buildItemDetailDto` or equivalent) to emit `resolved_labor_phase` instead of `inherited_labor_phase`/`labor_phase_mode`/`labor_phase_source_item_id`/`labor_phase_source_item_name`, gated by the same `item_labor_phase` read grant.
- Run `npm run codegen` — regenerate `item_detail.*.generated.ts`. Do not hand-edit generated output.

### Verify

- [x] `codegen --check` green after YAML/descriptor change
- [x] No orphaned references to `inherited_labor_phase` / `labor_phase_mode` / `labor_phase_source_item_id` / `labor_phase_source_item_name` outside this task's history

---

## Step 5 — Tests + stop gate

```bash
cd apps/subhub
npm run codegen:check
npm test -- --run estimate-commercial item-detail item-labor-phase item-commercial-fields
npm run build
```

### Manual smoke

1. Category "Speakers" authors Program (2h) + Test (1h) + Install (3h).
2. Leaf "Ceiling Speaker XR" under it, no own rows — shows all 3 as inherited.
3. Override Program to 3h on the leaf — Program becomes own/editable (3h), Test + Install stay inherited (1h / 3h).
4. Add an own Install row with `0` hours on the leaf — Install now shows `0` (excluded), Program still 3h own, Test still 1h inherited.
5. Estimate line on that leaf — `unit_labor` reflects Program 3h + Test 1h + Install 0h (i.e. excludes Install), not the old atomic-group all-or-nothing behavior.
6. Delete the own Program row — Program reverts to inherited 2h display after save.

### Verify (stop gate)

- [x] DAL merge helper (Step 2) implemented + tested
- [x] Catalog UI per-row inherit/override (Step 3) implemented
- [x] Surface/codegen updated (Step 4)
- [x] Targeted tests + `codegen:check` + `build` green
- [ ] Manual smoke 1–6 on dev
- [x] [`STATUS.md`](../../STATUS.md) + [`01-task-index.md`](./01-task-index.md) updated

---

## Risk notes

| Risk | Mitigation |
|------|------------|
| Existing dev data assumed atomic-group semantics | No DDL migration; call out in manual smoke that partial own-row items will pick up previously-hidden ancestor phases on next load — review dev catalog rows with partial own sets before demo |
| Catalog resolver and costing resolver drift apart over time | Both consume one shared merge helper (Step 2) — do not let a second implementation grow in either file |
| UI regression: `0`-hours rows read as "empty"/removed by mistake | Explicit test case (Step 3 verify) — `0` is a valid, persisted, meaningful value, not a sentinel for "no row" |

## Out of scope (37ad)

- Catalog-level tombstone/exclusion marker distinct from a `0`-hours row (considered, rejected — see decision)
- Changes to `estimate_scope_labor_phase` / `estimate_zone_labor_phase` inclusion semantics (N4) — unaffected
- Changes to job `scope_phase` seed logic (N6) — unaffected, just resolves a more accurate group
