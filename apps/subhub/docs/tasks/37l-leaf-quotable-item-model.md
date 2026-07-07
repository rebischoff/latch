# 37l — Leaf-quotable item model (`node_type`; drop branch ROM / descendant-max)

> **Status:** Complete (2026-07-06). Next: optional [37f](./37f-estimate-line-costing.md) manual smoke #5–#7.
>
> **Decision (to lock on approval):** [unified item tree — leaf-quotable amendment](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05) (amends **D1 / D4 / D8c**; clarifies **D2**). **Migration:** `044_leaf_quotable_item.sql`.

## Problem

040a merged `category` + `item` into one self-referential tree and made **any node selectable** on an estimate line (D1/D8c). To keep that promise the costing engine has to:

- `resolveRate` walk **self → descendant-max → ancestry** (`estimate-commercial.ts` `descendantMax` / `isBranch`, ~lines 105–232), and
- `filterPartsForItem` union the **entire subtree** part pool (`estimate-part-resolver.ts` `loadAnchorSubtreeIds` → `subtreeItemIds`).

`descendantMax` is the most complex, least-deterministic code in the engine: it compares potentially mixed-UOM leaves, has per-family scoring, and a ROM number that silently shifts when a descendant three levels down is edited.

## Choice (Q1 = ROM-as-item, Q2 = `node_type`)

Keep the single `item` tree. Reintroduce a **stored 3-way role discriminator** and restrict estimate selection to **quotable leaves**. Rough-order-of-magnitude quoting is served by **explicit quotable "allowance" items**, not by synthesizing a branch max.

| Role | `node_type` | `parent_id` | children | pickable on estimate |
|------|-------------|-------------|----------|----------------------|
| Scope root | `scope` | `NULL` | categories/items | no |
| Category | `category` | not null | yes (or empty pre-population) | no |
| **Item (leaf)** | `item` | not null | **none** | **yes** |

`node_type` is a **structural** role (where a node lives), **not** the retired `item.kind` (`product`/`labor`/`expense` — D2 stays dropped). Material shape remains emergent from what's attached.

### Invariants

| # | Rule | Enforcement |
|---|------|-------------|
| **I1** | `node_type = 'scope'` ⟺ `parent_id IS NULL`; `item` ⇒ has parent | DB `CHECK` |
| **I2** | `node_type = 'item'` ⇒ has no children (leaf) | DAL guard on child insert / reparent (+ optional trigger) |
| **I3** | Reparent allowed **within the same scope root**; no cycles; target not quotable | DAL guard in `updateItem` |
| **I4** | Cannot flip `item → category`/add child, and cannot delete/repoint, while referenced by `estimate_line.item_id` | DAL guard + existing `InUseError` path |
| **I5** | `estimate_line.item_id` must reference a `node_type = 'item'` node | DAL guard in line write |

---

## Step 1 — Decision amendment (paste into `catalog.md`)

Add the following amendment note to the **[unified item tree decision](../decisions/catalog.md#decision-unified-item-tree--merge-category--item-node-anchored-estimate-lines-2026-07-05)** header block, then edit the D1/D4/D8c rows to link it.

```markdown
**Amended (2026-07-06 — task 37l, leaf-quotable):** Estimate lines anchor to **quotable leaves only** (`item.node_type = 'item'`), not to branches.
- **D1 (amend):** `estimate_line.item_id` FK constrained to `node_type = 'item'`. A stored `item.node_type` (`scope` | `category` | `item`) replaces the "any depth" rule. Not a revival of `item.kind` (D2) — this is structural role, not material shape.
- **D4 (amend):** `resolveRate` drops the **descendant-max** step → `self → ancestry walk-up → neutral`. Because selection is leaf-only, cost (material/labor on the leaf) resolves via `self`, and margin policy (markup/freight/incidental authored high) resolves via ancestry. The mixed-UOM branch-material guard (Q2.2) is retired — no branch material fan-out remains.
- **D8c (reverse):** Item picker offers **quotable leaves only**; scopes + categories render expandable but **non-selectable**.
- **ROM:** rough quoting uses explicit quotable **allowance items** authored under a category (own `fallback_unit_cost` / labor group), not `descendantMax`. Keeps ROM deterministic, auditable, and node+PN reportable (D10).
- **Labor:** resolves as an **atomic group** — the leaf's `item_labor_phase` set, else the first ancestor's whole set. No per-phase merge/override across levels (v2 if needed).
```

### Verify
- [x] Amendment block added; D1/D4/D8c rows link it
- [x] `part.md` / `item.md` surface specs note leaf-only selection + `node_type`

---

## Step 2 — Migration `044_leaf_quotable_item.sql`

> `044` is the next free number. The deferred J8 `number`-type migration renumbers to `045`.

```sql
-- SubHub: leaf-quotable item model (task 37l / migration 044).
-- Prerequisite: 040a + 040b applied.
BEGIN;

-- 1. Discriminator column (default 'category'; backfilled below)
ALTER TABLE item
  ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'category'
  CHECK (node_type IN ('scope', 'category', 'item'));

-- 2. Backfill from structure: root -> scope, childless -> item, internal -> category
UPDATE item i
SET node_type = CASE
  WHEN i.parent_id IS NULL THEN 'scope'
  WHEN NOT EXISTS (SELECT 1 FROM item c WHERE c.parent_id = i.id) THEN 'item'
  ELSE 'category'
END;

-- 3. I1 — scope <=> root; item must have a parent
ALTER TABLE item
  ADD CONSTRAINT item_node_type_scope_root_chk
  CHECK ((node_type = 'scope') = (parent_id IS NULL));

-- 4. Pre-flight — reject if any estimate line anchors a non-quotable node (I5).
--    Dev data is reseedable (043 fire-alarm seed); fail loudly so the operator fixes seeds.
DO $$
DECLARE bad_lines INTEGER;
BEGIN
  SELECT COUNT(*)::int INTO bad_lines
  FROM estimate_line el
  INNER JOIN item i ON i.id = el.item_id
  WHERE i.node_type <> 'item';

  IF bad_lines > 0 THEN
    RAISE EXCEPTION '044 pre-flight failed: % estimate_line(s) anchor a non-item node — reseed or repoint to quotable leaves', bad_lines;
  END IF;
END $$;

-- 5. Optional DB defense-in-depth for I2 (primary enforcement is the DAL — Step 3).
CREATE OR REPLACE FUNCTION item_enforce_leaf() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL
     AND (SELECT node_type FROM item WHERE id = NEW.parent_id) = 'item' THEN
    RAISE EXCEPTION 'cannot add child under quotable item %', NEW.parent_id;
  END IF;
  IF NEW.node_type = 'item'
     AND EXISTS (SELECT 1 FROM item c WHERE c.parent_id = NEW.id) THEN
    RAISE EXCEPTION 'item % has children; cannot be quotable', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER item_enforce_leaf_biu
  BEFORE INSERT OR UPDATE ON item
  FOR EACH ROW EXECUTE FUNCTION item_enforce_leaf();

-- Codegen DDL anchor — no-op at apply time (column added above).
CREATE TABLE IF NOT EXISTS item (
  id         TEXT PRIMARY KEY,
  node_type  TEXT NOT NULL DEFAULT 'category'
);

COMMIT;
```

### Verify
- [x] `044` applies on dev; `node_type` populated (roots=`scope`, leaves=`item`, internal=`category`)
- [x] `item_node_type_scope_root_chk` holds
- [x] Pre-flight passes (reseed `043` fire-alarm items as leaves under categories if it raises)
- [x] `docs/schema/current.dbml` `item` amended with `node_type`

---

## Step 3 — DAL guards (I2–I5) + reparent (I3)

### `lib/catalog/repository/item-write.ts`

- `ItemWriteRow` — add `node_type: 'scope' | 'category' | 'item'` and `parent_id` becomes writable on update (reparent).
- **`insertItem`** (I2): after `assertParentItemExists`, reject when parent is quotable.

```ts
const assertParentNotQuotable = async (client: PoolClient, parentId: string): Promise<void> => {
  const { rows } = await client.query<{ node_type: string }>(
    `SELECT node_type FROM item WHERE id = $1`, [parentId],
  );
  if (rows[0]?.node_type === "item") {
    throw new ValidationError("Cannot add a child under a quotable item", {
      field: "profile", code: "parent_not_selectable", parent_id: parentId,
    });
  }
};
```

- **`updateItem`** (I2 + I3 + I4): support `parent_id` change with guards —
  - target parent exists and is **not** quotable (I2),
  - new parent shares the **same scope root** as the node (`resolveRootItemId` on both — I3),
  - new parent is **not** the node or a descendant of it (cycle guard — I3),
  - when setting `node_type = 'item'` (or adding children): reject if node has children / when demoting `item → category` reject if referenced by `estimate_line` (I4, reuse `loadItemDeleteBlockers`-style reference count).

```ts
// I3 — reparent within same root, no cycle
const assertReparentAllowed = async (
  client: PoolClient, itemId: string, newParentId: string | null,
): Promise<void> => {
  if (newParentId === null) return; // roots handled by scope semantics
  const rows = (await client.query<ItemFlatRow>(`SELECT id, parent_id FROM item`)).rows;
  const rootOf = (id: string) => resolveRootItemId(rows, id);
  if (rootOf(itemId) !== rootOf(newParentId)) {
    throw new ValidationError("Cannot move item to a different scope root", {
      field: "profile", code: "cross_root_move",
    });
  }
  // cycle: newParent must not be itemId or a descendant of itemId
  let cur: string | null = newParentId;
  const byId = new Map(rows.map((r) => [r.id, r]));
  while (cur) {
    if (cur === itemId) throw new ValidationError("Cannot move item under its own descendant", {
      field: "profile", code: "cycle_move",
    });
    cur = byId.get(cur)?.parent_id ?? null;
  }
};
```

### `lib/estimates/repository/estimate-lines-write.ts` (I5)

In `validateLineItems`, after the existing `if (!row.item_id)` check, assert the referenced node is quotable:

```ts
const { rows: nodeRows } = await client.query<{ node_type: string }>(
  `SELECT node_type FROM item WHERE id = $1`, [row.item_id],
);
if (nodeRows[0]?.node_type !== "item") {
  throw new ValidationError("item_id must reference a quotable item (leaf)", {
    field: "line_items", code: "item_not_selectable", id: row.id, item_id: row.item_id,
  });
}
```

### Verify
- [x] Insert child under quotable item → `parent_not_selectable`
- [x] Reparent across roots → `cross_root_move`; under own descendant → `cycle_move`; same-root move OK
- [x] Demote `item → category` while line-referenced → blocked (I4)
- [x] Estimate line with `item_id` on scope/category → `item_not_selectable`
- [x] `item-write.test.ts` + `estimate-lines-write.test.ts` cover the above

---

## Step 4 — `resolveRate` + `filterPartsForItem` simplification

### `lib/estimates/repository/estimate-commercial.ts`

- **Delete** `descendantMax` and `isBranch`.
- **Simplify** `resolveRate` to `self → ancestry → neutral`:

```ts
export const resolveRate = (
  catalog: CommercialCatalog,
  itemId: string,
  family: RateFamily,
): number | CostAddOnProfile | MarkupProfile | null =>
  selfRate(catalog, itemId, family) ?? ancestryFirst(catalog, itemId, family);
```

- Keep `selfRate`, `walkAncestry`, `ancestryFirst`, `laborCostForItem` unchanged. Labor now resolves as an atomic group: leaf's `item_labor_phase` set via `selfRate`, else first ancestor's whole set via `ancestryFirst`.
- `childrenByParent` may stay (still cheap to build) or be dropped if nothing else references it after `descendantMax`/`isBranch` removal — remove if unused.

### `lib/estimates/repository/estimate-part-resolver.ts`

- Remove `import { subtreeItemIds }` and `loadAnchorSubtreeIds`.
- `filterPartsForItem` operates on the **leaf's own** pool:

```ts
export const filterPartsForItem = async (
  client: Pool | PoolClient,
  itemId: string,
  bucket: MergedBucketSpecs,
): Promise<FilteredPartRow[]> => {
  const effectiveDefs = await unionEffectiveForItems(client as Pool, [itemId]);
  const effectiveDefIds = new Set(effectiveDefs.map((d) => d.spec_def_id));
  const candidateIds = await loadCandidatePartIds(client, [itemId]);
  // …unchanged: spec-filter, then max-vendor pricing on matched…
};
```

- Material price rules (O1) unchanged: **0** → `fallback_unit_cost`; **1** → that part's vendor; **many** → `maxVendorAmongParts` (now over genuine alternates of one item).

### Verify
- [x] `descendantMax` / `isBranch` gone; `estimate-commercial.test.ts` updated (drop descendant-max cases; add self→ancestry cases)
- [x] `estimate-part-resolver.test.ts` — candidate pool is leaf-only; 0/1/many outcomes intact
- [x] Recalc (`estimate-line-recalc.ts`) unchanged behavior for leaf lines; branch lines no longer reachable

---

## Step 5 — Picker + catalog UI

### `lib/catalog/repository/item-tree.ts` / `item-picker-tree.ts`
- Add `node_type` to `ItemFlatRow` SELECT in `loadAllItems`.
- `loadItemTreeForRoot` / `loadOrgItemTree`: set `selectable: item.node_type === "item"` instead of `true`. Branches stay in the tree, expandable, greyed for selection.

### `item_detail` surface (catalog admin)
- Show `node_type` (read-only badge or guarded control).
- Gate editable fields by role: **category/scope** → margin policy FKs (`markup_type_id`, `freight_rate_type_id`, `incidental_rate_type_id`); **item** → `fallback_unit_cost`, `item_labor_phase`, part pool (`part_item`). Mirrors owner-by-altitude spec pattern.
- Allow **reparent** (parent picker limited to same-root, non-quotable nodes) per I3.
- `New child` disabled under a quotable item (I2).

### Verify
- [x] Estimate item TreeSelect shows branches expandable but non-selectable; only leaves pick
- [x] Catalog item form: branch shows policy fields; leaf shows cost/labor/parts; reparent picker scoped to same root
- [x] `codegen:check` clean after `item_detail` / DBML changes

---

## Step 6 — Dev seed + smoke

- Amend `043_catalog_fire_alarm_dev_seed.sql` (or a new `046` seed) so parts/costs hang off **leaf** items under categories, plus at least one **"— ROM allowance"** leaf per category for rough quoting.

### Manual smoke
1. Catalog — leaf shows cost/labor/parts; category shows policy; cannot add child to a leaf.
2. Reparent a leaf to a sibling category (same root) — OK; attempt cross-root — blocked.
3. Estimate — item picker: pick a leaf → material/labor/markup resolve (self + walk-up); branches non-selectable.
4. Estimate — pick a "ROM allowance" leaf → `fallback_unit_cost` drives material; swap to a specific leaf → part resolves.

### Verify
- [x] Seed produces leaf-anchored costs + ROM allowance items
- [ ] Smoke 1–4 pass on dev

---

## Step 7 — Tests + build + STATUS

```bash
cd apps/subhub
npm run codegen:check
npm test -- --run estimate-commercial estimate-part-resolver estimate-line-recalc item-write estimate-lines-write
npm run build
```

### Verify (stop gate)
- [x] Decision amendment locked in `catalog.md` (Step 1)
- [x] `044` applied on dev; DBML synced
- [x] DAL guards I2–I5 + reparent (I3) implemented and tested
- [x] `resolveRate` = self→ancestry; `filterPartsForItem` leaf-only; `descendantMax` deleted
- [x] Picker leaf-only-selectable; catalog form gated by `node_type`
- [x] Targeted tests + `codegen:check` + `build` green
- [x] [`STATUS.md`](../../STATUS.md) + [`01-task-index.md`](./01-task-index.md) updated

---

## Risk notes

| Risk | Mitigation |
|------|------------|
| Existing dev lines anchor branches | `044` pre-flight raises with a count; reseed as leaves before apply |
| Ambiguous childless nodes (`category` vs unpopulated `item`) | Stored `node_type` is explicit — no guessing; default `category`, promote to `item` when authored as quotable |
| Loss of "quote a whole category" | ROM allowance leaves cover it, deterministically |
| `childrenByParent` now unused in commercial | Remove if dead after `descendantMax` deletion; otherwise harmless |
| Reparent recomputes inherited specs/rates for subtree | Same-root constraint keeps spec namespace stable; recalc runs on next estimate save (draft only, D6a) |
