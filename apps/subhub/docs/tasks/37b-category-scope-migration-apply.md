# 37b — Category scope: apply migration 033

> **Status:** Complete (2026-06-30). **Next:** [37c-site-scopes-zones.md](./37c-site-scopes-zones.md) — site `site_scope` / `site_zone` DAL + UI.
>
> **Prerequisite:** [37a-category-scope-decision-dbml-migration.md](./37a-category-scope-decision-dbml-migration.md) ✅
>
> **SQL:** [`033_category_scope.sql`](../../migrations/033_category_scope.sql) · **Plan:** [033-category-scope-plan.md](../migrations/033-category-scope-plan.md)

## Goal

Apply **`033_category_scope.sql`** on dev DB; run FK smoke queries; capture breakage list for **37c** (site DAL/UI).

**Exit:** Migration applied cleanly; smoke queries pass; STATUS → **37c**; app breakage documented (site + estimate DAL expected red until 37c+).

---

## Step 1 — Apply

```bash
cd apps/subhub
node ../../scripts/db-migrate.mjs --dir=. --only=033_category_scope.sql
```

Applied **2026-06-30** on dev Neon (`ep-curly-scene-akg25154-pooler`). `COMMIT` succeeded; `INSERT 0 3` (three `system` rows → category roots).

### Verify

- [x] No transaction rollback
- [x] `SELECT to_regclass('public.system')` is NULL
- [x] `site_scope`, `site_zone`, `estimate_scope` exist

---

## Step 2 — Smoke queries

Run queries from [033-category-scope-plan.md](../migrations/033-category-scope-plan.md) § Post-apply smoke.

| Query | Result |
|-------|--------|
| Category roots (`parent_id IS NULL`) | **3** |
| `site_scope` rows | **1** |
| `site_zone` rows | **1** |
| `estimate_scope` rows | **0** (no estimate scope data on dev) |
| `to_regclass('public.system')` | **NULL** |

### Verify

- [x] Category root count ≥ 0
- [x] Renamed tables readable

---

## Step 3 — Breakage inventory

**Note:** `npm run build` still **passes** — breakage is **runtime SQL** (raw table/column names in DAL strings), not TypeScript compile errors.

### Site geography

| File | Old references |
|------|----------------|
| `lib/sites/repository/site-geography.ts` | `site_system`, `site_area`, `system`, `site_area_id`, `site_system_id` |
| `lib/sites/repository/site-geography-write.ts` | `site_system`, `site_area`, `system`, `site_area_id`, `site_system_id` |
| `components/sites/SiteGeographyTree.tsx` | via `useCatalogSystemPicker` → `system` table |

**Runtime symptom:** site detail geography load/save → Postgres `relation "site_system" does not exist` (or similar).

### Estimate systems

| File | Old references |
|------|----------------|
| `lib/estimates/repository/estimate-systems.ts` | `estimate_system`, `system`, `system_spec_def`, `estimate_system_spec` |
| `lib/estimates/repository/estimate-systems-write.ts` | `estimate_system`, `system`, `system_spec_def`, `system_spec_option`, `estimate_system_spec` |
| `lib/estimates/repository/estimate-lines.ts` | `estimate_system_id` |
| `lib/estimates/repository/estimate-lines-write.ts` | `estimate_system_id` |
| `lib/estimates/repository/catalog-systems.ts` | `FROM system` |
| `lib/estimates/repository/catalog-system-specs.ts` | `system_spec_def`, `system_spec_option` |
| `lib/hooks/use-catalog-system-picker.ts` | catalog systems API |
| `app/api/sites/pickers/systems/route.ts` | `loadCatalogSystems` |
| `app/api/estimates/pickers/systems/route.ts` | `loadCatalogSystems` |
| `components/estimates/EstimateDetailForm.tsx` | `estimate_system_id` field |
| `components/estimates/EstimateLineTreeTable.tsx` | `estimate_system_id` |
| `components/estimates/estimate-line-tree.ts` | `estimate_system_id` |
| `lib/estimates/descriptors/estimate-detail.ts` | `estimate_system_id` |

**Runtime symptom:** estimate detail load/save, system picker routes fail on missing `system` / `estimate_system`.

### Job lines

| File | Old references |
|------|----------------|
| `lib/jobs/repository/job-lines.ts` | `site_area_id` |
| `lib/jobs/repository/job-lines-write.ts` | `site_area_id` |
| `lib/jobs/descriptors/job-detail.ts` | `site_area_id` |

**Runtime symptom:** job detail line read/write when lines have zone FK (column now `site_zone_id`).

### Unit tests

Mock-based tests (`site-geography-write.test.ts`, `estimate-write.test.ts`) still pass — they do not hit Postgres.

### Verify

- [x] Breakage list appended to this task or plan doc

---

## Step 4 — STATUS

| File | Action |
|------|--------|
| [`STATUS.md`](../../STATUS.md) | Recently completed 37b; **Right now** → 37c |

### Verify

- [x] STATUS updated

---

## Not in scope

- DAL/UI fixes (37c+)
- `npm run build` green (still passes; runtime SQL breaks until 37c+)
