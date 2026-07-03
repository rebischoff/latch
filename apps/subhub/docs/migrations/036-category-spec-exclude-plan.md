# Migration 036 — `category_spec_exclude`

> **Status:** Plan (2026-07-02). **Applied:** 2026-07-02. **Task:** [37d2](../tasks/37d2-category-spec-inheritance.md) · **Decision:** [inherit / include / exclude](../decisions/catalog.md#decision-category-spec-participation--inherit-include-exclude-2026-07-02).

## Goal

Add **`category_spec_exclude`** for opt-out of inherited spec participation. No change to **`category_spec_def`** shape — rows reinterpret as **includes** per 37d2.

## DDL (sketch)

```sql
CREATE TABLE category_spec_exclude (
  category_id   TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  spec_def_id   UUID NOT NULL REFERENCES spec_def (id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, spec_def_id)
);

-- grants: mirror 034_category_table_grants pattern for latch_app
```

## Data migration

| Situation | Action |
|-----------|--------|
| Existing `category_spec_def` on nested nodes | Keep as **includes**; admins may remove rows now covered by inheritance |
| `category_spec_exclude` | Empty at apply |

No automatic backfill — inheritance is computed; redundant include rows are harmless but noisy in UI.

## App breakage

| Area | Until 37d2 ships |
|------|------------------|
| Category UI | Still flat 37d checkboxes (wrong semantics) |
| Estimate scope panel | Still all root `spec_def`s |

## Rollback

```sql
DROP TABLE IF EXISTS category_spec_exclude;
```

Safe if no production dependency on exclude rows.

## Verify

- [x] `036_category_spec_exclude.sql` applies on dev
- [x] FK cascade from `category` / `spec_def` delete
