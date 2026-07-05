# Migration 037 — `category_spec_def` assign-once

> **Status:** Plan (2026-07-03). **Task:** [37d3](../tasks/37d3-category-spec-participation-simplify.md) · **Decision:** [assign-once, branch exclude](../decisions/catalog.md#decision-category-spec-participation--assign-once-branch-exclude-2026-07-03).

## Goal

Enforce **one assignment per `spec_def`** and align stored rows with the assign-once participation model (supersedes 37d2 delta includes).

## DDL (sketch)

```sql
-- After data cleanup: at most one category_spec_def row per spec_def_id
CREATE UNIQUE INDEX category_spec_def_spec_def_id_unique
  ON category_spec_def (spec_def_id);
```

No change to **`category_spec_exclude`** shape. Semantics tighten in DAL only (no re-include below exclude).

## Data migration

| Situation | Action |
|-----------|--------|
| Multiple `category_spec_def` rows for same `spec_def_id` | Keep **one** assignment — prefer **shallowest** node on path to root (smallest depth); tie-break `sort_order`, `category_id` |
| Nested row duplicates inherited parent assignment | Delete redundant row before UNIQUE apply |
| `category_spec_exclude` rows | Keep; verify no row pairs with assign on same node |

**Pre-flight query (inventory):**

```sql
SELECT spec_def_id, COUNT(*) AS n
FROM category_spec_def
GROUP BY spec_def_id
HAVING COUNT(*) > 1;
```

Document count in task stop gate if non-zero on dev.

## App breakage

| Area | Until 37d3 ships |
|------|------------------|
| Category UI | 37d2 Inherited / Include / Exclude / Base includes |
| Effective resolver | 37d2 delta algorithm |
| PATCH | `includes[]` / `excludes[]` delta shape |

## Rollback

```sql
DROP INDEX IF EXISTS category_spec_def_spec_def_id_unique;
```

Safe if assign-once not relied on in production.

## Verify

- [x] `037_category_spec_assign_once.sql` applies on dev
- [x] Duplicate `spec_def_id` assignments rejected on INSERT
- [x] Fire Alarm worked example round-trips under assign-once resolver
