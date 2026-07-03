# 38 — Master-detail chrome (shared toolbar + create navigation)

> **Status:** Complete (2026-07-01). Next: [39-toolbar-chrome-slots.md](./39-toolbar-chrome-slots.md) (category New child parent fix).
>
> **Planning:** [12-master-detail-chrome.md](../planning/12-master-detail-chrome.md) · **Decisions:** [list+detail create](../decisions/general.md#decision-listdetail-surface-create--toolbar-and-picker-add-new-2026-06-19).

## Goal

Extract reusable master-detail **toolbar** and **create navigation** so every list+detail Surface shares one pattern. **Categories create fix is Track B** — after Layer 2 lands ([planning doc § Track B](../planning/12-master-detail-chrome.md#track-b--categories-after-layer-2)).

## Non-goals

- Generic detail forms or DAL changes
- IAM grant-matrix refactor
- Category child spec-participation seeding (deferred)

---

## Step 1 — Layer 1 utilities

| File | Action |
|------|--------|
| `lib/hooks/use-debounced-value.ts` | **Create** |
| `lib/next-search-params.ts` | **Create** — `toSearchParams()` |
| `lib/hooks/create-surface-picker-hook.ts` | **Create** — optional; migrate one picker as proof |

### Verify

- [x] Debounce adopted in at least one list (e.g. `PartList`)
- [x] `toSearchParams` used by `sites/new` and `manufacturers/new`
- [x] `npm run test` green

---

## Step 2 — Layer 2 chrome + sites pilot (one PR)

| File | Action |
|------|--------|
| `lib/surface-navigation.ts` | **Create** — `sanitizeReturnTo`, `buildCreateUrl`, cancel/after-create |
| `components/surface/SurfaceFormChromeContext.tsx` | **Create** |
| `lib/hooks/use-master-detail-toolbar.ts` | **Create** |
| `components/shell/MasterDetailToolbarHost.tsx` | **Create** |
| `components/shell/SurfaceToolbar.tsx` | **Update** — dropdown variant (create Save hover; New button) |
| `app/(private)/sites/layout.tsx` | **Create/move** — flatten routes; provider + host |
| `app/(private)/sites/page.tsx` | **Create/move** — placeholder |
| `app/(private)/sites/[id]/page.tsx` | **Create/move** — `id === "new"` branch + detail |
| `components/sites/SiteList.tsx` | **Update** — remove toolbar registration |
| `components/sites/SiteDetailForm.tsx` | **Update** — `useSurfaceFormChrome`; Save and New; dirty Cancel |

Remove `app/(private)/sites/(master-detail)/` after move.

### Verify

- [x] **New** on `/sites` and `/sites/[id]` when `site_detail` `write` granted
- [x] **New** navigates to `/sites/new?returnTo=…` (sanitized); **disabled** when form dirty
- [x] Create: **Save** ▾ (hover) — **Save** → `/sites/[id]`; **Save and New** → reset on `/new`
- [x] Picker create (`returnField`): plain **Save** only → `redirectAfterCreate`
- [x] **Cancel**: dirty confirm in form; navigates to sanitized `returnTo`
- [x] Edit: plain **Save** + **Delete** (sites: no Revert)
- [x] Picker flow estimate → site create still works
- [x] No double toolbar registration
- [x] Unit tests: `sanitizeReturnTo`, `buildCreateUrl`

---

## Step 3 — Retrofit other business surfaces

Migrate: parts, jobs, estimates, employees, manufacturers (same checklist as planning doc § A1.10).

### Verify

- [x] Each surface: New on list + detail; create uses `/new` + Save; Cancel uses `returnTo`
- [x] `onListRoute` removed from all `*List.tsx` toolbar blocks

---

## Step 4 — Layer 3 list scaffolding (optional same phase)

| File | Action |
|------|--------|
| `components/surface/SurfaceListTable.tsx` | **Create** |
| `lib/hooks/use-surface-list-search.ts` | **Create** |

### Verify

- [x] At least two lists use shared table/search helpers (`PartList`, `ManufacturerList`; `CategoryTreeList` uses search helper)

---

## Step 5 — Track B categories (separate PR)

See [planning § Track B](../planning/12-master-detail-chrome.md#track-b--categories-after-layer-2). Amends 37d / `category.md`.

### Verify

- [x] Inline POST removed from `CategoryTreeList` — **New** dropdown on `MasterDetailToolbarHost`
- [x] Root → `/categories/new?returnTo=…`; child → `&parent_id=<id>` (parent from selection ref — [task 39](./39-toolbar-chrome-slots.md))
- [x] `CategoryDetailForm` — draft save, Cancel, Save and New; `parent_id` on create body
- [x] [category.md](../surface-specs/category.md) toolbar table updated
- [x] Child spec-participation seeding — **deferred** (non-goal)

---

## Dependencies

| Consumer | Needs |
|----------|-------|
| **Categories fix** | Step 2 complete |
| **Future surfaces** | Registry + chrome host — copy sites layout pattern |

## Related

- [27-create-route-retrofit.md](./27-create-route-retrofit.md) — `/new` route convention
- [33-estimate-site-anchor.md](./33-estimate-site-anchor.md) — `returnTo` on site create
