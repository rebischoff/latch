# Site geography UI — decision gate (sites only)

> **Status:** **All SG1–SG16 locked** (2026-06-30). **Task:** [34-site-geography-ui.md](../tasks/34-site-geography-ui.md). **Vocabulary superseded by 37c** — `site_scope` / `site_zone`, Fields `scopes` / `general_zones`; see [37c-site-scopes-zones.md](../tasks/37c-site-scopes-zones.md).
>
> **Backbone (already shipped):** DDL `site_system`, `site_area`, `site_asset` in migrations `029`+; planning in [`01-site-as-built.md`](./01-site-as-built.md). **App today:** `site_detail` has profile + portfolio + contacts only — **no geography DAL/UI**.

---

## Why sites first

Estimate “Import from site” and quote trees need **`site_area`** rows to exist and a tree UX pattern to copy. Ship and validate **system → area** editing on `site_detail` before estimate work.

**Out of scope for this pass:** `site_asset` UI (job phase), estimate `estimate_area`, win reconcile.

---

## Already locked — do not re-litigate

| ID | Topic | Source |
|----|--------|--------|
| L1 | Hierarchy | `site` → optional `site_system` → `site_area` (tree) → `site_asset` (leaf) |
| L2 | `site_system` optional | Areas may use `site_system_id` null = default bucket (S2) |
| L3 | Per-system trees | FA Floor 1 ≠ CCTV Floor 1 — separate `site_system` instances |
| L4 | Area nesting | `parent_area_id` within same system/bucket (S3) |
| L5 | `area_type` | ~~Free text v1 (S4)~~ **Dropped** — task 35; name-only areas |
| L6 | Assets | Leaf only; no `parent_asset_id` v1 (S5); **not edited on site_detail in this pass** |
| L7 | Asset lifecycle | Created/updated at install / `job.complete` — not on estimate, not on site create |
| L8 | Status enums | Area/system: `proposed` \| `active` \| `removed` \| `cancelled`; asset: `planned` \| … (separate pass) |
| L9 | Tombstones | Referenced rows → status change, not hard delete |
| L10 | Estimate | Does **not** write site geography while quoting (2026-06-29) |
| L11 | Catalog `system` | Picker from seeded `system` table (same source as estimate system picker) |
| L12 | Site create | Name-only site remains valid; geography optional after create |

---

## Open decisions — lock before planning

Answer each row (recommended default in **bold**). Task file references these as **SG1–SG12**.

### Data model & PATCH

| ID | Question | Options | Recommendation |
|----|----------|---------|----------------|
| **SG1** | **Field shape on `site_detail`** | A) One logical Field `geography` (nested DTO) · B) Two Fields `systems` + `areas` flat · C) One Field `systems` with nested `areas[]` per system | **✅ C (locked)** — one Field `systems[]` with nested `areas[]` per system; DAL flattens to `site_system` + `site_area`. |
| **SG2** | **Default bucket (no system)** | A) Show synthetic “General” root in UI when no `site_system` rows · B) Hide until user adds a system · C) Require at least one `site_system` to add areas | **✅ A (locked)** — synthetic **General** root; areas persist with `site_system_id` null. PATCH: sibling `default_areas[]` or equivalent flatten (task spec). |
| **SG3** | **Duplicate catalog `system_id` per site** | A) Max one `site_system` per `system_id` per site (mirror estimate) · B) Allow multiple instances (e.g. two FA panels) | **✅ B (locked)** — multiple `site_system` rows per catalog `system_id` allowed (e.g. FA Panel A / Panel B). **Amends** prior “one block per catalog system” on **site** and **estimate** — disambiguate by `site_system.name` / `estimate_system` display name; picker does not exclude by `system_id` alone. |
| **SG4** | **`site_system.name`** | A) Required display name · B) Default from catalog `system.name`, user may override · C) Always catalog name (read-only) | **✅ B (locked)** — default catalog name, overridable. When SG3 duplicate `system_id`: validate distinct `name` before Save (or auto-suffix). |
| **SG5** | **Default status on `site_detail` Save** | A) New rows `active` · B) New rows `proposed` · C) User picks per row | **✅ A (locked)** — rows created on `site_detail` default `active`. `proposed` reserved for rows introduced via job (and win reconcile later). |
| **SG6** | **PATCH semantics** | A) Replace-array `systems` (+ nested areas) in one Save with profile/contacts · B) Separate API/actions per subtree | **✅ A (locked)** — single PATCH replace-array with profile, portfolio, contacts. |

### Delete & references

| ID | Question | Options | Recommendation |
|----|----------|---------|----------------|
| **SG7** | **Delete area with children** | A) Block · B) Cascade delete children client + server · C) Cascade tombstone (`removed`) | **✅ B (locked)** — cascade delete unreferenced subtrees; reject if any node in subtree referenced (SG8). |
| **SG8** | **Referenced row omit from PATCH** | A) 409 `ConflictError` · B) Auto tombstone to `removed` · C) Allow omit only if status already terminal | **✅ A (locked)** — reject Save with structured error; UI disables delete when referenced. |
| **SG9** | **Delete `site_system`** | A) Block if areas exist · B) Cascade areas (same rules as SG7) · C) Move areas to default bucket | **✅ B (locked)** — cascade delete system + area subtree; SG7/SG8 reference rules apply. |

### UI layout & interaction

| ID | Question | Options | Recommendation |
|----|----------|---------|----------------|
| **SG10** | **Section placement** | A) New section below contacts on same page · B) New tab “Geography” on `site_detail` · C) Separate route `/sites/[id]/geography` | **✅ B (locked)** — **Geography** tab on `site_detail`; profile/portfolio/contacts stay on first tab; **one** form + Save/Revert across tabs (shared RHF state). |
| **SG11** | **Editor chrome** | A) Left `Tree` + right props panel · B) Ant Design **`Table` + `treeData`** (inline row editors) · C) Tree + drawer | **✅ A (amended 2026-06-30, task 36)** — antd **`Tree`** + `titleRender` (`SiteGeographyTree`); name-only `Input` — **`readOnly` + `variant="borderless"`** until click/focus, reverts on blur; **Name** label + form control width (not full tree width). No columns, no side panel. *Was B (task 34 interim `SiteGeographyTreeTable`).* |
| **SG12** | **Reorder** | A) Drag-and-drop v1 · B) Move up/down · C) Append order only | **✅ A (amended, task 36)** — antd Tree **`draggable`** + **`allowDrop`**. **Sibling-only:** systems reorder among root rows; areas reorder among siblings under same parent. **No** reparent via drag. General not draggable. `sort_order` = 1-based sibling index on Save. *Was `@dnd-kit` row drag (task 34).* |
| **SG13** | **Add control chrome** | A) Toolbar buttons · B) Context menu · C) Single **Add ▾** on toolbar | **✅ A (amended, task 36)** — **two controls:** **Add system ▾** (catalog dropdown) + **Add area** (button). *Was C single Add ▾ (task 34).* |
| **SG14** | **Initial tree** | A) General only · B) General + hint/CTA · C) Hidden until system | **✅ B (amended)** — on load: **single General parent** only + optional hint; systems appear when added. |

### Catalog & permissions

| ID | Question | Options | Recommendation |
|----|----------|---------|----------------|
| **SG15** | **Field grants** | A) Single `write` covers geography · B) Separate Field `geography` grant | **✅ A (locked)** — geography under existing `site_detail` `write`; no per-Field split v1. |
| **SG16** | **Add behavior by selection** | See § UI amendment — three modes + General | **✅ (amended 2026-06-30, task 36)** — **Add system ▾** always appends catalog **`system`** at root (below General). **Add area** inserts child under **selected** row when selection is **General**, **`system`**, or **`area`**; disabled when nothing selected. New rows auto-focus name into edit. *Was single Add ▾ with three modes (task 34).* |

---

## UI amendment — antd `Tree` editor (2026-06-30, task 36)

**Supersedes** task 34 Table `treeData` sketch. Name-only inline editors in `titleRender`.

### Geography tab layout

```text
┌─ site_detail — Save | Revert | Delete ─────────────────────────────┐
│ [ General ] [ Geography ]                                            │
├─ Geography tab ──────────────────────────────────────────────────────┤
│  Optional. Define systems and areas for quoting and jobs.              │
│  [ Add system ▾ ]  [ Add area ]                                      │
│  ┌ Tree (defaultExpandAll) ─────────────────────────────────────────┐ │
│  │ ▼ General          (static label — not deletable)                │ │
│  │ ▼ Name  Fire Alarm (borderless until edit)               [🗑]     │ │
│  │     ▼ Name  1st Floor                                    [🗑]     │ │
│  │         Name  East wing                                  [🗑]     │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Init (SG14)

- Tree **always** starts with one **General** root (synthetic bucket for `site_system_id` null areas).
- No catalog **system** rows until user adds them.
- Hint text above tree (SG14 B).

### Add controls (SG13 + SG16, task 36)

| Control | Behavior |
|---------|----------|
| **Add system ▾** | Catalog **`system`** dropdown; appends root system below General; selects new system row |
| **Add area** | Inserts **area** child under **selected** **General**, **`system`**, or **`area`** row; **focus name** (starts in edit). **Disabled** when nothing selected |

### Delete (row actions)

| Row | Delete |
|-----|--------|
| **General** | **No** trash — bucket is permanent |
| **System** | Trash removes system + **cascade** area subtree (SG7–SG9) |
| **Area** | Trash removes area + cascade children |
| Referenced | Trash **disabled**; Save 409 if omitted (SG8) |

### DnD (SG12, task 36)

| Drag | Allowed |
|------|---------|
| System ↔ system (root siblings) | Reorder among systems — **General stays first**; General not draggable |
| Area ↔ area, same parent | Reorder siblings |
| Area into another system or different parent | **Blocked** via `allowDrop` |

### Component

`SiteGeographyTree` + `site-geography-tree.ts` helpers (`buildGeographyTree`, `toAntdTreeData`, mutation helpers). Catalog list: **`useCatalogSystemPicker`**.

---

## UI amendment — Ant Design Table `treeData` (2026-06-30, task 34 — superseded by task 36)

**Historical.** Task 34 shipped `SiteGeographyTreeTable`; task 36 replaced with antd `Tree`. DAL/PATCH unchanged.

<details>
<summary>Task 34 Table layout (historical)</summary>

### Init (SG14)

- Tree **always** starts with one **General** parent row (synthetic bucket for `site_system_id` null areas).
- No catalog **system** rows until user adds them.
- Hint text above table (SG14 B).

### Add ▾ behavior (SG13 + SG16)

**Focused row** = last clicked table row (same pattern as `EstimateLineTreeTable` `focusedParentKey`).

| Focused row | **Add** click |
|-------------|----------------|
| **None** | Opens **dropdown** of catalog **`system`** rows (shared picker hook/API — not filtered by already-used `system_id`, SG3). Choosing one inserts a **system** at **root** (sibling of General). Default `name` from catalog (SG4). |
| **General** | Inserts **area** under General bucket; **focus name** on new row. |
| **System** | Inserts **area** as direct child of that system; **focus name**. |
| **Area** | Inserts **area** child under that area; **focus name**. |

When focus is **system** or **area**, **Add** does **not** open the catalog dropdown — it always adds an area (SG16.2 / SG16.3).

### Delete (row actions)

| Row | Delete |
|-----|--------|
| **General** | **No** trash — bucket is permanent |
| **System** | Trash removes system + **cascade** area subtree (SG7–SG9) |
| **Area** | Trash removes area + cascade children |
| Referenced | Trash **disabled**; Save 409 if omitted (SG8) |

### DnD (SG12)

| Drag | Allowed |
|------|---------|
| System ↔ system (root siblings, excluding General fixed position?) | Reorder among systems — **✅ General stays first** (locked); General not draggable |
| Area ↔ area, same parent | Reorder siblings |
| Area into another system or different parent | **Blocked** |

### Row kinds & columns (v1)

| `rowKind` | Columns (line rows) | Notes |
|-----------|---------------------|--------|
| `general` | Label only; `colSpan` or chrome row | Not selectable for system add |
| `system` | Name (editable), actions (delete, drag) | Catalog `system_id` on row; display name SG4 |
| `area` | Name (editable), actions (delete, drag) | Status hidden v1 if SG5 always `active` on create — *task 35: no `area_type` / `code`* |

**Deferred columns:** `status` picker on site_detail; `site_asset` leaves.

### Component

`SiteGeographyTreeTable` + `site-geography-tree.ts` helpers (mirror `estimate-line-tree.ts`). Catalog list: reuse estimate system picker → rename **`useCatalogSystemPicker`** when touching hooks.

</details>

---

## Proposed UI sketch (superseded — see § UI amendment above)

<details>
<summary>Old Tree + panel sketch (withdrawn)</summary>

```text
(split Tree + SiteGeographyNodePanel — withdrawn 2026-06-30)
```
</details>

---

## Pitfalls (design for upfront)

| Risk | Mitigation |
|------|------------|
| Stale [`site-geography.md`](../surface-specs/site-geography.md) (`sections`/`locations`) | Amend or supersede in same task — do not implement against legacy spec |
| Circular `parent_area_id` | DAL validate on PATCH; UI prevent selecting descendant as parent |
| Cross-system area move | Disallow in v1 — delete + recreate under target system |
| Huge trees | Virtualize tree if needed; v1 likely &lt; 200 nodes |
| Picker return from estimate “Add site” | Geography section hidden on create until save — OK; user returns to estimate with name-only site |
| `code` field | ~~Optional in UI~~ **Removed** — task 35 dropped column |

---

## Deliverables after decisions locked

| Artifact | Action |
|----------|--------|
| [`site.md`](../surface-specs/site.md) | Add `systems` Field (nested areas), §B–§E, collections UX |
| [`site-geography.md`](../surface-specs/site-geography.md) | **Rewrite** for `site_system`/`site_area` or mark superseded by `site.md` amendment |
| [`decisions/site.md`](../decisions/site.md) | Decision block — site geography UI (date) |
| `site_detail.surface.yaml` | `systems` logical Field |
| DAL | read/write replace-array; reference checks (SG7–SG9) |
| UI | `SiteGeographyTree` on Geography tab (`SiteDetailForm` tabs) |
| Task file | e.g. `34-site-geography-ui.md` |

**Not in deliverables:** `site_asset` CRUD, estimate import, YAML for assets.

### Cross-cutting — SG3 amends estimate rule

Prior estimate spec ([`estimate.md`](../surface-specs/estimate.md), task 32): max one `estimate_system` per `system_id` per estimate. **SG3 B** locks the same flexibility on quotes: multiple blocks per catalog system (e.g. two FA panels), disambiguated by user-facing name and optional `site_system_id` link when import ships. Estimate DAL duplicate-`system_id` rejection must be removed in a follow-on task — **out of scope** for site geography UI task.

---

## Confirmation checklist

Before writing the task file, confirm:

- [x] SG1 — Field shape (**C** — `systems[]` + nested `areas[]`)
- [x] SG2 — Default bucket UX (**A** — General root)
- [x] SG3 — Multiple `site_system` per catalog `system_id` (**B** — also amends estimate one-block rule when quote geography ships)
- [x] SG5 — New site-detail rows default `active` (**A**)
- [x] SG7–SG9 — Delete / reference rules (**B** / **A** / **B**)
- [x] SG10 — **B** — Geography tab on `site_detail`
- [x] SG11 — **A (amended, task 36)** — antd `Tree` + `titleRender`
- [x] SG12 — **A (amended, task 36)** — antd Tree sibling-only DnD
- [x] SG13 — **A (amended, task 36)** — Add system ▾ + Add area buttons
- [x] SG14 — **B (amended)** — init: General parent only
- [x] SG15 — **A** — single `write` grant
- [x] SG16 — **Add system ▾ + Add area** by selection (task 36)
- [x] Assets explicitly out of scope for this task
- [x] Estimates deferred until site geography UX validated

---

## Related

- [`01-site-as-built.md`](./01-site-as-built.md) — entity model
- [`02-estimates.md`](./02-estimates.md) — estimate reads site; deferred
- [Task 30 § Site geography](../tasks/30-backbone-surfaces-review.md) — impact matrix
