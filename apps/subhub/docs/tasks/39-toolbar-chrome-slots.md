# 39 — Category New child parent fix (master-detail selection)

> **Status:** Complete (2026-07-02). Next: [37e estimate scope tab](./37e-estimate-scope-tab.md).
>
> **Planning:** [13-toolbar-chrome.md](../planning/13-toolbar-chrome.md) · **Builds on:** [38-master-detail-chrome.md](./38-master-detail-chrome.md) · **Decisions:** [list+detail create](../decisions/general.md#decision-listdetail-surface-create--toolbar-and-picker-add-new-2026-06-19).

## Goal

Fix the **category New child** bug: a child saved under the wrong parent. Deliver the **smallest correct fix** — a scoped selection channel the tree writes and the toolbar reads — with a **deterministic** (unit-tested) parent-id resolution. Generalizing into shared toolbar "slots" is **deferred** until a second tree-list surface needs it (Step 3, optional).

## Non-goals

- **Repo-wide chrome rename** (`SurfaceFormChromeContext → MasterDetailChromeContext`) — deferred to optional Step 3; not required by the bug
- Editing flat-surface detail forms (sites, parts, jobs, estimates, employees, manufacturers, parties) — untouched
- Moving toolbar out of app header
- Per-node tree "Add child" only (header **New** dropdown stays)
- Session storage / cookies for `parent_id`
- Zustand (Context + ref is sufficient — see § Determinism)
- Child spec-participation seeding on create (still deferred)
- `/new` prefetch expansion (separate concern; planning Track C)

---

## Problem

Toolbar derives the New child parent from **pathname** (`entityId`). `router.push` commits the pathname **asynchronously**; the tree updates its selection **synchronously** on click. Rapid or out-of-order navigations leave pathname behind the tree, so **New child** builds `/categories/new?parent_id=<stale id>`. Transport (`?parent_id=`) and server save path are correct — only **parent-id sourcing at click time** is wrong.

Prior debug attempts failed because they added effects that **synced pathname → selection**, which re-introduced the race when out-of-order `router.push` calls resolved.

---

## Is the bug actually resolved, or still a timing gamble?

**Deterministic — no timing gamble.** This is the crux of the fix, so it is spelled out:

| Question | Answer |
|----------|--------|
| Does it depend on the user clicking fast/slow? | **No.** |
| What is "the parent" for New child? | **Defined** as the last node the user selected in the tree — nothing else. |
| How is that read without a race? | The selection context exposes a **ref** (`selectionRef.current`), read **synchronously at New child click** — never the lagging pathname, never a closed-over stale state value. |

**Why there is no window:**

1. Tree `onSelect` sets `selectionRef.current = id` **synchronously**, in the same handler that fires `router.push`. The ref holds the correct id **before** `router.push` even begins its async commit.
2. **New child** reads `selectionRef.current` at the moment it is clicked. A user physically cannot click a tree node and the toolbar's New child in the same synchronous tick — but even if the intervening re-render hasn't flushed, the **ref** already has the latest value (state closures could be stale; the ref cannot).
3. **No effect ever writes pathname → selection.** The lagging/out-of-order route can never overwrite the ref. This single rule is what makes it deterministic (and is exactly what the failed attempts violated).

**Fallback is also race-free:** when there is no tree selection (deep link, browser back/forward, refresh landing on `/categories/<id>`), the ref is `null` and we fall back to pathname `entityId`. In those paths the pathname is **already committed** — there is no pending async navigation to race against — so the fallback is safe.

**Residual (by design, not a race):** New child reflects the **last tree click**, which is also what the tree highlights. If a user deep-links to a detail URL and then clicks New child without touching the tree, parent = pathname id (correct). The two only diverge during the navigation gap, and in that gap the tree click (ref) is the intended parent.

Mirror of the existing `registrationRef` pattern in [`SurfaceFormChromeContext.tsx`](../../components/surface/SurfaceFormChromeContext.tsx) (`useSurfaceFormChromeRegistration` reads `registrationRef.current`).

---

## Locked decisions

| ID | Topic | Choice |
|----|--------|--------|
| T1 | Parent-id source (tree) | `selectionRef.current` (last tree click); fallback to pathname `entityId` when null |
| T2 | Read mechanism | **Ref-backed synchronous read** at New child click — not closed-over state, not pathname |
| T3 | No back-sync | **Never** sync pathname → selection in a `useEffect` (the invariant that kills the race) |
| T4 | Tree highlight | `selectedId ?? selectedFromRoute` (optimistic; state drives re-render for highlight) |
| T5 | Scope | New **`MasterDetailSelectionContext`** (selection concern), **not** a rename of form chrome; only `CategoryTreeList` + composer consume it |
| T6 | Flat surfaces | **Omit** the selection channel entirely — `entityId` from pathname is sufficient |
| T7 | Single registrar | Unchanged — only `MasterDetailToolbarHost` calls `useRegisterSurfaceActions` |

---

## Step 1 — Minimal selection context + categories fix

Delivers the user-facing fix in one small PR. Blast radius: categories + the composer only.

| File | Action |
|------|--------|
| `components/shell/MasterDetailSelectionContext.tsx` | **Create** — `{ selectedId, setSelectedId, selectionRef }`; provider + `useMasterDetailSelection`; ref updated in `setSelectedId`. **No** route→selection effect. |
| `components/shell/MasterDetailChromeLayout.tsx` | **Update** — wrap children in `MasterDetailSelectionProvider` (sibling to `SurfaceFormChromeProvider`) |
| `components/catalog/CategoryTreeList.tsx` | **Update** — on `onSelect`: `setSelectedId(id)` (updates ref) then `router.push`; highlight `selectedId ?? selectedFromRoute`; remove local `useState` dual source |
| `lib/surfaces/resolve-child-parent-id.ts` | **Create** — pure `resolveChildParentId({ selectionId, entityId, config })` |
| `lib/hooks/use-master-detail-toolbar.tsx` | **Update** — read `selectionRef` via context; New child parent = `resolveChildParentId(...)`; disabled when result null |

### Verify

- [x] `resolveChildParentId` unit tests: selection set → selection wins; selection null → pathname entityId; flat surface → entityId; both null → null (disabled)
- [x] Select Fire Alarm → **New child** → Save → child under Fire Alarm
- [x] **Rapid** tree clicks then immediate New child → parent = last clicked node (deterministic via ref)
- [x] Deep-link `/categories/<id>` (no tree click) → New child → parent = pathname id
- [x] `/categories` placeholder, nothing selected → **New child disabled**
- [x] **New root** still omits `parent_id`
- [x] `/categories/new?parent_id=` still parsed server-side on `[id]/page`
- [x] **No** `useEffect` syncing pathname → selection
- [x] Flat surfaces (sites, parts, …) unchanged — no selection channel, no form edits
- [x] `npm run test` green

---

## Step 2 — Docs

| File | Action |
|------|--------|
| `docs/planning/12-master-detail-chrome.md` | **Update** — amend B4 (pathname-only) per T1: tree surfaces source child parent from selection ref |
| `docs/planning/13-toolbar-chrome.md` | **Update** — mark T1–T7 locked; record inverted sequencing (fix first, generalize later) |
| `docs/surface-specs/category.md` | **Update** — toolbar/create rows: parent id from tree selection |
| `docs/decisions/general.md` | **Update** — Decision block: master-detail tree selection source (if locking) |

### Verify

- [x] Planning B4 amended/superseded
- [x] `category.md` reflects selection-sourced parent
- [x] Task 38 Track B parent-id note cross-linked to this task

---

## Step 3 — Generalize to shared slots (OPTIONAL — only when a 2nd tree surface appears)

Deferred by design (YAGNI). Do **not** do this to fix the bug. Revisit when another tree-list surface needs child-create, or when consolidating chrome contexts is independently worthwhile.

| File | Action |
|------|--------|
| `components/surface/MasterDetailChromeContext.tsx` | **Create** — fold `form` + `list/selection` into named slots |
| `components/surface/SurfaceFormChromeContext.tsx` | **Update/replace** — migrate form slot; keep thin re-export or delete |
| `components/*/*DetailForm.tsx` | **Update** — rename hook usage (mechanical, no behavior change) |

### Verify

- [ ] Only run when triggered; not part of the bug-fix PR
- [ ] If done: all detail forms migrate; flat behavior unchanged; single registrar preserved

---

## Dependencies

| Consumer | Needs |
|----------|-------|
| **Categories admin** | Step 1 |
| **Second tree-list surface (future)** | Step 3 generalization |

## Related

- [13-toolbar-chrome.md](../planning/13-toolbar-chrome.md)
- [12-master-detail-chrome.md](../planning/12-master-detail-chrome.md)
- [38-master-detail-chrome.md](./38-master-detail-chrome.md)
- [37d-category-catalog-dal-surfaces.md](./37d-category-catalog-dal-surfaces.md)
- [`SurfaceFormChromeContext.tsx`](../../components/surface/SurfaceFormChromeContext.tsx) — `registrationRef` pattern to mirror
