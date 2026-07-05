# Migration 035 — `estimate_zone` + General `estimate_scope`

> **Task:** [37e](../tasks/37e-estimate-scope-tab.md) · **Prerequisite:** [033](./033-category-scope-plan.md) applied.

## Purpose

- **`estimate_zone`** junction — zone checkbox persistence on quotes (PK `estimate_scope_id`, `site_zone_id`).
- **General `estimate_scope`** — `site_scope_id` and `root_category_id` both null; at most one per estimate.
- **`estimate_scope.root_category_id`** nullable with CHECK for scoped vs General rows.

## Apply

```bash
cd apps/subhub
psql "$DATABASE_URL" -f migrations/035_estimate_zone.sql
```

## Smoke

```sql
SELECT to_regclass('public.estimate_zone');

-- General scope insert (requires existing estimate id)
INSERT INTO estimate_scope (estimate_id, site_scope_id, root_category_id, sort_order)
VALUES ('<estimate_id>', NULL, NULL, 0);
```

## Follow-on

- **37f** — zone line parents, item TreeSelect, costing snapshots; **039** retire General ([plan](./039-retire-general-scope-plan.md)).
