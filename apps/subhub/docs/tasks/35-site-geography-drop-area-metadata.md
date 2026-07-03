# 35 — Site geography: drop `area_type` / `code`

> **Status:** Complete (2026-06-30). Next: [36-site-geography-tree-ui.md](./36-site-geography-tree-ui.md) *(antd `Tree` editor — name-only, no columns)*.
>
> **Amends:** [34-site-geography-ui.md](./34-site-geography-ui.md) · **Decision:** [`decisions/site.md`](../decisions/site.md#decision-site-area-shape--name-only-v1-2026-06-30)

## Goal

Remove unused `site_area.area_type` and `site_area.code` from DB, DAL, PATCH DTOs, and Geography UI. Site geography v1 edits **name** only.

**Exit:** Migration applied; PATCH/GET shapes omit fields; Geography table shows name column only; tests + build pass.

---

## Step 1 — Migration

| File | Action |
|------|--------|
| `migrations/032_drop_site_area_metadata.sql` | **Create** — `ALTER TABLE site_area DROP COLUMN area_type, code` |

### Verify

- [x] Migration runs on dev DB after `029`

---

## Step 2 — DAL + descriptors

| File | Action |
|------|--------|
| `lib/sites/descriptors/site-detail.ts` | Remove `area_type`, `code` from area types + Zod |
| `lib/sites/repository/site-geography.ts` | Read SELECT + nest DTO |
| `lib/sites/repository/site-geography-write.ts` | Flatten + INSERT/UPDATE SQL |
| `lib/sites/repository/site-geography-write.test.ts` | Update fixtures |

### Verify

- [x] `npm test -- --run site-geography-write` passes

---

## Step 3 — UI + form helpers

| File | Action |
|------|--------|
| `components/sites/site-geography-tree.ts` | Remove from `SiteAreaFormRow`, `makeAreaRow`, `stripGeographyForPatch` |
| `components/sites/SiteDetailForm.tsx` | `mapAreas` without metadata fields |
| `components/sites/SiteGeographyTreeTable.tsx` | Remove Type/Code columns (`columnCount` → 2) |

### Verify

- [x] Geography tab: area rows show name + delete only
- [x] Save round-trip preserves names and tree shape

---

## Step 4 — Docs

| File | Action |
|------|--------|
| `docs/schema/current.dbml` | `site_area` columns |
| `docs/surface-specs/site.md` | PATCH examples + UX line |
| `docs/decisions/site.md` | Decision block |

### Verify

- [x] No remaining `area_type` / `code` on `site_area` in app code (grep)

---

## Stop gate

```bash
cd apps/subhub && npm test -- --run site-geography-write
cd apps/subhub && npm run build
```

### Verify (stop gate)

- [x] Steps 1–4 verify checklists `[x]`
- [x] Commands pass
- [x] [`STATUS.md`](../../STATUS.md) updated

---

## Follow-on

| Item | Track |
|------|-------|
| antd `Tree` editor (replace table) | [36-site-geography-tree-ui.md](./36-site-geography-tree-ui.md) |
| `estimate_area` DDL | [35-estimate-wave-4c-prime.md](./35-estimate-wave-4c-prime.md) *(rename TBD)* |
