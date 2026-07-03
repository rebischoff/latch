# 13 — Toolbar chrome (slot-based communication)

> **Status:** Locked (2026-07-02). Implemented in [task 39](../tasks/39-toolbar-chrome-slots.md) — fix-first sequencing (selection context before optional slot generalization).
>
> **Builds on:** [12 — Master-detail chrome](./12-master-detail-chrome.md) (Layers 1–2 shipped), [routing-and-libraries.md](../routing-and-libraries.md#surface-toolbar), [decisions/general.md](../decisions/general.md) (list+detail create, `/new` route, picker return).
>
> **Task (draft):** [39-toolbar-chrome-slots.md](../tasks/39-toolbar-chrome-slots.md).

---

## Problem

Task **38** delivered shared master-detail chrome (`MasterDetailChromeLayout`, `SurfaceFormChromeContext`, `MasterDetailToolbarHost`, `useMasterDetailToolbar`). Flat list+detail surfaces work. **Tree list** surfaces expose a communication gap:

| Symptom | Root cause |
|---------|------------|
| **New child** creates under wrong parent (categories) | Toolbar reads `entityId` from **pathname**; tree updates selection **synchronously**; `router.push` commits **later** — stale URL wins |
| Tree highlight ≠ detail route | `CategoryTreeList` uses `selectedFromRoute ?? selectedId` — two sources of truth |
| Ad hoc fixes failed | Route→selection sync effects overwrite newer tree clicks when out-of-order navigations complete |

**Not broken:** `?parent_id=` on `/categories/new`, server prefetch on `[id]/page`, form save path, manifest gating. Transport is fine; **parent id sourcing at New-child click** is wrong.

**Goal:** One clear contract for **who publishes what** to the toolbar across layout siblings (list, detail form, chrome host) without moving toolbar into pages or using hidden storage (session/cookies).

---

## Locked context (from 12 — unchanged unless amended below)

| Topic | Rule |
|-------|------|
| **Physical toolbar** | `HeaderSurfaceToolbar` in `AppShell` via `SurfaceActionsProvider` (app root) |
| **Single registrar** | `MasterDetailToolbarHost` per segment layout — list and form do **not** call `useRegisterSurfaceActions` |
| **Route shape** | `layout.tsx` + `page.tsx` + `[id]/page.tsx`; **`new` is sentinel `id`** in `[id]` — not a separate `new/` folder |
| **List prefetch** | Server `prefetchSurfaceList` in layout; client refetch on save via React Query invalidation |
| **Detail prefetch** | Server `prefetchSurfaceDetail` on `[id]/page` when `id !== "new"` |
| **Create prefetch** | Server `prefetchSurfaceCreate` on `id === "new"` — **extend** to prefetch lookup lists + default seeds where surfaces need them |
| **New placement / labels** | Same toolbar on list placeholder and detail; label **`New`** only |
| **Create URL** | `<surface>/new?returnTo=…` (+ `parent_id` for child create) |
| **Form actions** | Detail form publishes Save / Revert / Delete / Cancel via chrome hook |

---

## Amendments to 12 (locked — task 39)

| ID | Topic | Was (12 A1.4b) | Locked (2026-07-02) |
|----|--------|----------------|---------------------|
| **T1** | **Child-create parent id** | B4: host parses `entityId` from pathname only | **Tree surfaces:** composer uses **`selectionRef.current`** (last tree click), with pathname `entityId` as fallback when selection null |
| **T2** | **Read mechanism** | — | **Ref-backed synchronous read** at New child click — not closed-over state, not pathname |
| **T3** | **No back-sync** | — | **Never** sync pathname → selection in a `useEffect` |
| **T4** | **List selection highlight** | Implicit dual state in `CategoryTreeList` | **`selectedId ?? selectedFromRoute`** — optimistic tree highlight; no route→selection effect |
| **T5** | **Chrome context shape** | `SurfaceFormChromeContext` = form only | **`MasterDetailSelectionContext`** (selection only) — form chrome rename/generalize **deferred** (Step 3) |
| **T6** | **Flat surfaces** | — | **Omit** selection channel usage — pathname `entityId` sufficient |
| **T7** | **Single registrar** | Unchanged | Only `MasterDetailToolbarHost` calls `useRegisterSurfaceActions` |
| **T8** | **`/new` prefetch scope** | Manifest only | Manifest + **surface-specific** lookup/default prefetch (Track C — unchanged) |

---

## Architecture — three layers

```text
L1 — Render (app root)
  SurfaceActionsProvider → HeaderSurfaceToolbar
  Consumes: ToolbarModel { manifest, actions[] }

L2 — Compose (segment layout)
  MasterDetailToolbarHost
  Reads: pathname, searchParams, surfaceConfig, chrome slots
  Builds: ToolbarAction[]
  Registers: single useRegisterSurfaceActions → L1

L3 — Publish (layout children)
  Detail form → form slot (handlers, dirty, manifest)
  List pane  → list slot (selectedId) — tree surfaces only
```

**Invariant:** URL owns **route mode** and **committed** record id. Slots own **client handlers** and **immediate selection intent** (tree click).

---

## Route + data loading (aligned model)

```text
app/(private)/<surface>/
  layout.tsx
    prefetch list (server, once per layout mount)
    MasterDetailShell
      list → *List | CategoryTreeList
      children → page | [id]/page
    MasterDetailToolbarHost
  page.tsx
    /surface — placeholder (no record)
  [id]/page.tsx
    id === "new" → prefetch create (+ lookups/defaults) → form
    else         → prefetch detail → form
```

| Route | Server load | Form slot | List slot |
|-------|-------------|-----------|-----------|
| `/surface` | List (layout) | — | optional `selectedId` |
| `/surface/<id>` | List + detail | Save, Revert, Delete… | `selectedId` (tree) |
| `/surface/new` | List + create manifest/lookups | Save, Cancel… | `selectedId` (tree; return context) |

---

## Slot API (sketch — lock in implementation task)

### Form slot — `useToolbarFormSlot` (replaces `useSurfaceFormChrome`)

Published by `*DetailForm` on mount; cleared on unmount.

```ts
type ToolbarFormSlot = {
  mode: "create" | "edit";
  manifest: Manifest;
  canSave: boolean;
  saving: boolean;
  isDirty?: boolean;
  onSave: () => void;
  onRevert?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSaveAndNew?: () => void;
};
```

RHF stays inside the form — only `form.handleSubmit(...)` crosses the slot as `onSave`.

### List slot — `useToolbarListSlot` (tree / master-detail only)

Published by list pane; **write on row/tree click only**.

```ts
type ToolbarListSlot = {
  selectedId: string | null;
};
```

**Rules:**

- Set `selectedId` synchronously in `onSelect` before/alongside `router.push`.
- **Never** sync pathname → `selectedId` in a `useEffect` (causes stale-route overwrite).
- Flat lists (`SiteList`, `PartList`, …): **omit** list slot — `entityId` from pathname is sufficient.

### Composer — `useMasterDetailToolbar` (existing hook, extended)

```ts
const mode = resolveRouteMode(pathname, config);
const entityId = parseEntityId(pathname, config); // /surface/[id]
const form = useToolbarFormSlotRegistration();
const list = useToolbarListSlotRegistration();

const childParentId =
  config.create?.variant === "category"
    ? (list?.selectedId ?? entityId)
    : entityId;

// New child → buildCreateUrl({ params: { parent_id: childParentId } })
```

---

## What URL vs slots own

| Concern | Source of truth |
|---------|-----------------|
| idle / create / edit | `pathname` |
| Committed record id | `pathname` → `parseEntityId` |
| New child parent (tree) | **list slot** at click time → `?parent_id=` |
| Save / Revert / Delete | form slot |
| `returnTo`, `returnField` | `searchParams` + `surface-navigation` |
| Permission gating | server manifest on prefetch / form `activeManifest` |

**Security:** `parent_id` in query is an intent hint only — server re-validates on POST (`assertParentCategoryExists`, manifest narrow).

---

## Options considered (storage for slots)

| Option | Verdict |
|--------|---------|
| **A — Context slots in segment layout** | **Recommended** — extends shipped `SurfaceFormChromeProvider`; no new dependency |
| **B — Zustand slot map** | Viable if sync `getState()` reads become necessary; not required for v1 fix |
| **C — App-wide flat `useToolbar({ actions })`** | Rejects — registration fights; every form reimplements New/returnTo |
| **D — Session storage / cookies for parent_id** | Rejects — hidden state; same race if sourced from pathname |
| **E — Portal toolbar into page** | Rejects — DOM placement only; does not solve sibling communication |
| **F — Per-node tree “Add child” only** | Rejects — poor UX; header dropdown should stay |

---

## Component tree (target)

```text
AppShell
  SurfaceActionsProvider
    HeaderSurfaceToolbar          ← L1 render
    Content
      <surface>/layout.tsx
        MasterDetailChromeProvider   ← L3 bus (form + list slots)
          HydrationBoundary (list prefetch)
            MasterDetailShell
              list → CategoryTreeList
                useToolbarListSlot({ selectedId })  // on click
              children → [id]/page.tsx
                CategoryDetailForm
                  useToolbarFormSlot({ onSave, ... })
            MasterDetailToolbarHost                   ← L2 compose
              useMasterDetailToolbar → useRegisterSurfaceActions
```

---

## Migration / work tracks

| Track | Scope | When |
|-------|--------|------|
| **A — Slot refactor** | Generalize context; rename hooks; no behavior change on flat surfaces | First |
| **B — Categories fix** | `CategoryTreeList` publishes list slot; composer uses `childParentId`; remove dual highlight sync | After A |
| **C — `/new` prefetch** | Expand `prefetchSurfaceCreate` per surface (lookups, defaults) | Per surface, parallel |
| **D — Doc amend** | Update [12](./12-master-detail-chrome.md) B4, [category.md](../surface-specs/category.md) toolbar table | With B |

**Out of scope:** IAM surfaces (different create gate), catalog table surfaces, moving toolbar out of app header.

---

## Open questions — lock before task

| ID | Question | Options | Recommendation |
|----|----------|---------|----------------|
| **Q1** | Rename `SurfaceFormChromeContext`? | A) Rename to `MasterDetailChromeContext` · B) Keep name, add list slice | **A** — reflects form + list |
| **Q2** | Tree highlight while pending | A) Show list slot id immediately · B) Show pathname only | **A** — `selectedId ?? selectedFromRoute` |
| **Q3** | Disable New child while `useTransition` pending? | A) Yes · B) No — list slot is enough | **B** if Q2 + list slot locked |
| **Q4** | `router.push` vs `replace` for tree nav | A) `push` · B) `replace` to reduce stack | **A** unless stack depth becomes a problem |
| **Q5** | Implementation storage | A) Context slots · B) Zustand | **A** unless debugging pain |

---

## Verify (stop gate — task 39 complete)

- [x] Exactly one `useRegisterSurfaceActions` per master-detail layout (unchanged)
- [x] Flat surface: New child N/A; New uses pathname; no list slot required
- [x] Categories: select root → New child → Save → child under correct parent (rapid tree clicks)
- [x] `/surface/new?parent_id=` still server-parsed on `[id]/page`
- [x] No route→list selection sync effect
- [x] Form unmount on navigate away clears form slot
- [x] [category.md](../surface-specs/category.md) toolbar + create rows updated
- [x] [12-master-detail-chrome.md](./12-master-detail-chrome.md) B4 amended or superseded by T1

---

## Related

- [12-master-detail-chrome.md](./12-master-detail-chrome.md) — shipped chrome (task 38)
- [38-master-detail-chrome.md](../tasks/38-master-detail-chrome.md) — verify checklist (complete)
- [category.md](../surface-specs/category.md) — tree list + New root / New child
- [routing-and-libraries.md](../routing-and-libraries.md) — Surface toolbar priority + overflow
- [`SurfaceFormChromeContext.tsx`](../../components/surface/SurfaceFormChromeContext.tsx) — current form slot
- [`use-master-detail-toolbar.tsx`](../../lib/hooks/use-master-detail-toolbar.tsx) — current composer
