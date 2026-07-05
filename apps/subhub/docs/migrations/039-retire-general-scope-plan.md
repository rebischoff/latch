# Migration 039 — Retire General scope (site + estimate)

> **Task:** [37f](../tasks/37f-estimate-line-costing.md) · **Decision:** [O6 retire General](../tasks/37f-estimate-line-costing.md#decision-o6--retire-general--single-migration-039-with-37f) · **Supersedes:** General paths from [035](./035-estimate-zone-plan.md) and site `general_zones`.

## Purpose

Implement [scope required (2026-07-04)](../decisions/estimate.md#decision-estimate-scope-required--pricing-overrides-2026-07-04):

- Every **`site_zone`** has non-null **`site_scope_id`**
- Every **`estimate_line`** has non-null **`estimate_scope_id`**
- No synthetic **General `estimate_scope`** (`site_scope_id` and `root_category_id` both null)
- Drop `estimate_scope_scoped_or_general_chk` General branch + `estimate_scope_general_per_estimate_idx`

**Cut:** single migration **`039_retire_general_scope.sql`** shipped **with** 37f app/DAL/UI (not a prep-only migration).

## Backfill (dev)

### 1 — Catalog root for migrated site scopes

If no root named **`General`** exists, insert one:

```sql
INSERT INTO category (id, name, parent_id, sort_order)
SELECT gen_random_uuid()::text, 'General', NULL, 9999
WHERE NOT EXISTS (
  SELECT 1 FROM category WHERE parent_id IS NULL AND name = 'General'
);
```

Use this root for scopes created from former site General zones only (mobilization / unscoped geography).

### 2 — Site `site_zone` with `site_scope_id IS NULL`

Per `site_id` that has orphan zones:

1. `INSERT INTO site_scope (site_id, root_category_id, name, …)` — one row named **`General`** (or site-specific label) pointing at catalog root **General**.
2. `UPDATE site_zone SET site_scope_id = <new scope> WHERE site_id = ? AND site_scope_id IS NULL`.

### 3 — Estimate synthetic General `estimate_scope`

```sql
DELETE FROM estimate_scope
WHERE site_scope_id IS NULL AND root_category_id IS NULL;
```

(CASCADE removes `estimate_zone` / specs on those rows.)

### 4 — ROM `estimate_line` (`estimate_scope_id IS NULL`)

Per estimate with orphan lines:

1. If estimate has ≥1 scoped `estimate_scope` row → set orphan lines to **lowest `sort_order` scoped row**.
2. Else if estimate’s site has ≥1 `site_scope` → **insert `estimate_scope`** for first site scope (auto-check) and point lines there.
3. Else → **`RAISE EXCEPTION`** with count (dev DB should be fixable manually; no silent data loss).

### 5 — DDL (after backfill)

| Change | Notes |
|--------|--------|
| `site_zone.site_scope_id` | `SET NOT NULL` |
| `estimate_line.estimate_scope_id` | `SET NOT NULL` |
| `estimate_scope` | `site_scope_id` + `root_category_id` both `NOT NULL`; drop General CHECK + partial unique index |

## App changes (same 37f change set)

| Area | Action |
|------|--------|
| Site | Remove **`general_zones`** Field / UI; zones only under **`scopes`** |
| Estimate Scope tab | Remove General tree parent + synthetic scope create |
| Estimate lines | Remove ROM **General** parent; require checked scope before add line |
| DAL | Reject `general_zones` PATCH; reject null `estimate_scope_id` on lines |

## Smoke

```sql
SELECT COUNT(*) FROM site_zone WHERE site_scope_id IS NULL;          -- 0
SELECT COUNT(*) FROM estimate_line WHERE estimate_scope_id IS NULL;  -- 0
SELECT COUNT(*) FROM estimate_scope
 WHERE site_scope_id IS NULL AND root_category_id IS NULL;           -- 0
```

## Follow-on

- **37f** — `spec_def` number type, part filter, material snapshot (may extend 039 or **040** if DDL too large)
