# Surface planning depth

> **Status:** Active (2026-06-20). **Active task:** [20-ui-discovery.md](./tasks/20-ui-discovery.md).  
> **Implement specs:** [19-surface-implement-specs.md](./tasks/19-surface-implement-specs.md) — **paused** at checkpoint (13/27).  
> **Catalog (Field map):** [`surfaces.md`](./surfaces.md).

## Planning model (amended 2026-06-20)

| Layer | Artifact | When |
|-------|----------|------|
| **Data** | [`schema/current.dbml`](./schema/current.dbml) | Task 17 ✅ |
| **Field catalog** | [`surfaces.md`](./surfaces.md) — routes, Fields, waves | Task 18 ✅ |
| **Implement specs — CRM checkpoint** | `surface-specs` rows **#1–14** | Task 19 checkpoint ✅ |
| **UI discovery** | Migration + sites slice + estimate spike | **Task 20 — active** |
| **Implement specs — ops/catalog** | Rows **#15–28**; start with `estimate.md` | **After** task 20 planning session |
| **Production code (ongoing)** | YAML → DAL → UI per wave | Discovery + waves |

**Choice (2026-06-17):** Plan v1 Surfaces at implement depth holistically.

**Amendment (2026-06-20):** Do **not** finish all specs before any code. Pause task 19 at the **CRM checkpoint**, run [UI discovery](./tasks/20-ui-discovery.md), then write ops/finance specs **from proven UI**. See [decision](./decisions/general.md#decision-planning-model--ui-discovery-before-ops-specs-2026-06-20).

**Discussion model:** Chat → spec + `decisions/` + DBML. For estimate/job/invoice, **spike first** when layout is the unknown; then capture A–K in the spec file.

---

## Where you are — quick map

| If STATUS says… | You are… | Open |
|-----------------|----------|------|
| Task 20 step 1 | Writing/applying `018`–`020` | [`site-migration.md`](./tasks/deferred/site-migration.md) |
| Task 20 step 2 | Sites YAML / DAL / UI | [`site.md`](./surface-specs/site.md) |
| Task 20 step 3 | Estimate line-editor spike | [`spikes/estimate-line-editor.md`](./spikes/estimate-line-editor.md) |
| Task 20 step 4 | **Planning session** — lock UX, write `estimate.md` | [`20-ui-discovery.md`](./tasks/20-ui-discovery.md#step-4--planning-session-stop-gate) |
| Resume task 19 | Spec conveyor — **`estimate.md` first** | [`00-scan.md`](./surface-specs/00-scan.md) row #20 |
| Wave 2b / 3+ | Named in STATUS after step 4 | [`01-task-index.md`](./tasks/01-task-index.md) |

---

## Surface planning depth checklist

Use one row per Surface (or matched list/detail pair). Tiers: **catalog** · **design** · **implement**.

| # | Area | Catalog (task 18) | Design | Implement (task 19) |
|---|------|-------------------|--------|---------------------|
| **A** | **Identity** | `surface_id`, route, nav group, anchor table(s), wave | — | Registry / manifest plan |
| **B** | **Fields** | List columns; detail Field ids | Collection element shape | Writable vs read-only; omit rules |
| **C** | **Policy** | Surface actions named | Role / tab visibility | Grant matrix; 403 vs 404 |
| **D** | **DAL — read** | Tables joined | DTO shape | `get` / list contracts |
| **E** | **DAL — write** | PATCH keys | Replace-array semantics | create/patch/delete/actions |
| **F** | **DAL — domain rules** | Decision pointers | Cross-Surface flows | Testable invariants |
| **G** | **UI — layout** | List+detail vs table | Tabs/sections | Component map — **spike may precede spec for ops Surfaces** |
| **H** | **UI — chrome** | — | Toolbar priorities | Actions + linked Surfaces |
| **I** | **UI — collections** | Field ids | Add/remove UX | Pickers, empty states |
| **J** | **Lifecycle** | — | Status enums | Transitions, create flow |
| **K** | **Edge cases** | — | Deferrals listed | Seeds, progressive setup |

**Task 19 final exit:** every row in [`surface-specs/00-scan.md`](./surface-specs/00-scan.md) at implement tier (A–K filled).

---

## Workflow

```mermaid
flowchart LR
  dbml[current.dbml]
  catalog[surfaces.md]
  scan[00-scan.md]
  chk[19 checkpoint CRM specs]
  discover[20 UI discovery]
  specs[surface-specs ops + catalog]
  code[migrations YAML DAL UI]
  dbml --> catalog --> scan --> chk
  chk --> discover
  discover --> specs
  specs --> code
  discover --> code
```

---

## Related

- [`tasks/20-ui-discovery.md`](./tasks/20-ui-discovery.md) — **active steps**
- [`surface-specs/00-scan.md`](./surface-specs/00-scan.md) — inventory + progress
- [`tasks/19-surface-implement-specs.md`](./tasks/19-surface-implement-specs.md)
- [`spikes/README.md`](./spikes/README.md)
- [`child-collections.md`](./child-collections.md)
