# Migration 038 — spec ownership column (`spec_def.category_id`)

> **Status:** Plan (2026-07-04). **Decision:** [spec ownership — `spec_def.category_id`, drop `category_spec_def`](../decisions/catalog.md#decision-spec-ownership--spec_defcategory_id-drop-category_spec_def-2026-07-04). **Supersedes storage of:** [037 assign-once](./037-category-spec-assign-once-plan.md).

## Goal

Collapse the 1:1 `category_spec_def` assignment table into a single **`spec_def.category_id`** owner column, and derive the namespace root from the category tree. Keep `category_spec_exclude` and the `effective()` / owner-branch visibility algorithms unchanged.

## DDL (sketch)

```sql
BEGIN;

-- 1. New owner column (nullable during backfill)
ALTER TABLE spec_def ADD COLUMN category_id text;

-- 2. Backfill: prefer explicit assignment, else fall back to namespace root
UPDATE spec_def sd
SET category_id = COALESCE(
  (SELECT csd.category_id
   FROM category_spec_def csd
   WHERE csd.spec_def_id = sd.id
   LIMIT 1),
  sd.root_category_id
);

-- 3. Enforce + wire FK
ALTER TABLE spec_def ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE spec_def
  ADD CONSTRAINT spec_def_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE CASCADE;

-- 4. Drop the redundant assignment table + old namespace column
DROP TABLE category_spec_def;
ALTER TABLE spec_def DROP COLUMN root_category_id;

COMMIT;
```

`category_spec_exclude` shape is **unchanged**.

## Data migration

| Situation | Action |
|-----------|--------|
| Def has a `category_spec_def` row (assigned) | `category_id` = that owner (assign-once already guarantees one row) |
| Def has **no** assignment row (e.g. SLC) | `category_id` = old `root_category_id` — def becomes owned by its scope root; now inherits to descendants (bug fix) |
| Multiple assignment rows | N/A — `037` UNIQUE(spec_def_id) already guarantees at most one |
| `category_spec_exclude` rows | Keep; verify none references a def whose new owner is not an ancestor (orphan exclude — safe to leave, has no effect) |

**Pre-flight inventory (dev):**

```sql
-- Defs with no assignment row (will fall back to root owner)
SELECT sd.id, sd.display_name, sd.root_category_id
FROM spec_def sd
LEFT JOIN category_spec_def csd ON csd.spec_def_id = sd.id
WHERE csd.spec_def_id IS NULL;
```

Document the count in the implementation task stop gate.

**Applied on dev (2026-07-04):** 2 total `spec_def` rows; **1 unassigned** (`SLC Protocol`) backfilled to its former `root_category_id` owner (Fire Alarm root) — now inherits to descendants. `Spec B` kept its explicit nested owner. Post-migration: 0 rows with null `category_id`; `category_spec_def` dropped; `spec_def.root_category_id` dropped.

## App breakage (until implementation task ships)

| Area | Reads today | Must change to |
|------|-------------|----------------|
| `loadRootSpecDefinitions` | `WHERE root_category_id = $1` | owner (`category_id`) in subtree of R |
| `category-effective-specs.ts` | `assignByDef` from `category_spec_def` | from `spec_def.category_id` |
| `spec-def-write.ts` | insert `category_spec_def` on create | set `spec_def.category_id` on insert |
| category delete blockers | join `sd.root_category_id` | join owner-in-subtree |
| estimate `scopePanelDefs` | subtree walk (logic unchanged) | same walk, new source column |

Downstream FKs (`spec_option`, `manufacturer_part_spec`, `estimate_scope_spec`, `estimate_zone_spec`, `estimate_line_spec`) all reference `spec_def.id` — **unaffected**.

## Rollback

```sql
BEGIN;

-- Recreate assignment table
CREATE TABLE category_spec_def (
  category_id text NOT NULL,
  spec_def_id uuid NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, spec_def_id)
);
CREATE UNIQUE INDEX category_spec_def_spec_def_id_unique
  ON category_spec_def (spec_def_id);

-- Restore namespace column (root ancestor of owner)
ALTER TABLE spec_def ADD COLUMN root_category_id text;
-- NOTE: root ancestor must be recomputed by walking category.parent_id;
-- straight copy of category_id is only correct when all owners were roots.

-- Rebuild assignment rows from owner column
INSERT INTO category_spec_def (category_id, spec_def_id, sort_order)
SELECT category_id, id, sort_order FROM spec_def;

ALTER TABLE spec_def DROP COLUMN category_id;

COMMIT;
```

**Caveat:** rollback loses the true `root_category_id` for defs owned at nested categories unless the ancestor walk is applied. Prefer forward-fix over rollback once nested owners exist.

## Verify

- [x] `038_category_spec_owner_column.sql` applies on dev
- [x] Every `spec_def` row has non-null `category_id` after backfill
- [x] Unassigned defs (SLC case) now owned by former root and inherit to descendants
- [x] `category_spec_def` dropped; `spec_def.root_category_id` dropped
- [x] `category_spec_exclude` intact
