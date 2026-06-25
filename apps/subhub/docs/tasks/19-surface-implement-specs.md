# 19 — Surface implement specs (v1)

> **Status:** Resumed (2026-06-23). Progress **16/27** ([`00-scan`](../surface-specs/00-scan.md) rows **#1–14**, **#19–21** ✅). **Active work:** catalog specs **#15–18** (`part`, `item`, `category_table`, `labor_class_table`) — [23-job-wave-5a.md](./23-job-wave-5a.md) complete.

## Goal

Produce **implement-tier** specs for **every v1 Surface** — DAL contracts, policy, UI layout, lifecycle — aligned with [`current.dbml`](../schema/current.dbml) and [`surfaces.md`](../surfaces.md).

**Checkpoint (2026-06-20):** CRM hub + sites + `part` specs are sufficient to begin **UI discovery** ([task 20](./20-ui-discovery.md)). Remaining rows (**#15–28**) resume **after** estimate spike + planning session — ops/finance specs should reflect built UI.

**Why now:** Task 18 delivered the Field map. DBML delivers data depth. Implementation kept stalling because screen-level behavior was not written down. This task is that pass.

## Prerequisites

- [18-surface-catalog.md](./18-surface-catalog.md) complete
- [17-schema-design-pass.md](./17-schema-design-pass.md) complete
- Skim [`surface-specs/00-scan.md`](../surface-specs/00-scan.md)

## Files

| File | Action |
|------|--------|
| [`surface-specs/README.md`](../surface-specs/README.md) | Index + workflow |
| [`surface-specs/00-scan.md`](../surface-specs/00-scan.md) | **Create** — v1 inventory + progress table |
| [`surface-specs/_template.md`](../surface-specs/_template.md) | Per-Surface template (A–K) |
| [`surface-specs/<name>.md`](../surface-specs/) | **Create** — one per scan row (27 files; row #3 merged into `iam-user.md`) |
| [`surfaces.md`](../surfaces.md) | **Patch** — fix catalog gaps found during specs (e.g. `phase_table`) |
| [`surface-planning-depth.md`](../surface-planning-depth.md) | Align with full-v1 approach |
| [`01-task-index.md`](./01-task-index.md) | Insert task 19; task 20 unblocks wave 1 implementation |
| [`../../STATUS.md`](../../STATUS.md) | Point **Right now** here |

## Steps

### 1. General scan (done in repo)

[`00-scan.md`](../surface-specs/00-scan.md) — all Surfaces vs DBML, gaps, ordered queue.

### 2. One-by-one specs

For each row in scan progress table:

1. Copy [`_template.md`](../surface-specs/_template.md)
2. Complete A–K for that Surface group
3. Mark ✅ in scan table
4. Back-patch `surfaces.md` if catalog was wrong/incomplete

**Order:** IAM → party lenses → sites → wave 2 addenda → catalog → estimates → jobs → procurement → billing → cross-cutting.

### 3. Reconcile catalog

After all specs: `surfaces.md` matches spec files; `00-scan` shows all ✅.

## Checkpoint verify (2026-06-20)

- [x] CRM hub + sites implement specs — scan rows **#1–14** ✅
- [x] [`00-scan.md`](../surface-specs/00-scan.md) progress table current
- [x] Task [20](./20-ui-discovery.md) created; [`STATUS.md`](../../STATUS.md) repointed

## Final verify (task exit — after task 20 + resume)

- [ ] [`00-scan.md`](../surface-specs/00-scan.md) — all progress rows ✅
- [ ] Every business anchor in DBML is covered (Surface or [not-a-Surface](../surfaces.md#not-a-surface))
- [ ] `phase_table` (or explicit defer) in `surfaces.md`
- [ ] Ops/finance specs (**#19–27**) informed by UI discovery spikes where applicable
- [ ] [`01-task-index.md`](./01-task-index.md) — implementation waves aligned with shipped discovery
- [ ] [`../../STATUS.md`](../../STATUS.md) → next implementation wave (catalog, estimate production, …)

## Out of scope (this task)

- SQL, Surface YAML, DAL, UI — **except** via [task 20](./20-ui-discovery.md) discovery program
- Pixel-perfect design
- `latch_users.user_class` (portal row scope) — see [party identity](../decisions/party.md#decision-party-identity--party_person-login-link-2026-06-18)

## Reference

- [surface-specs/README.md](../surface-specs/README.md)
- [surface-planning-depth.md](../surface-planning-depth.md)
- [child-collections.md](../child-collections.md)
- [decisions/README.md](../decisions/README.md)
