# 19 — Surface implement specs (v1)

> **Status:** Active (2026-06-17). Next spec: [`surface-specs/00-scan.md`](../surface-specs/00-scan.md) row **#1** `iam-user.md`.

## Goal

Produce **implement-tier** specs for **every v1 Surface** — DAL contracts, policy, UI layout, lifecycle — aligned with [`current.dbml`](../schema/current.dbml) and [`surfaces.md`](../surfaces.md). **Docs only.** No migrations, YAML, DAL, or UI until this task exits.

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
| [`surface-specs/<name>.md`](../surface-specs/) | **Create** — one per scan row (28 files) |
| [`surfaces.md`](../surfaces.md) | **Patch** — fix catalog gaps found during specs (e.g. `phase_table`) |
| [`surface-planning-depth.md`](../surface-planning-depth.md) | Align with full-v1 approach |
| [`01-task-index.md`](./01-task-index.md) | Insert task 19; block wave implementation until exit |
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

## Verify (stop gate)

- [ ] [`00-scan.md`](../surface-specs/00-scan.md) — all progress rows ✅
- [ ] Every business anchor in DBML is covered (Surface or [not-a-Surface](../surfaces.md#not-a-surface))
- [ ] `phase_table` (or explicit defer) in `surfaces.md`
- [ ] No implementation task started (migrations/YAML/DAL/UI) before exit
- [ ] [`01-task-index.md`](./01-task-index.md) — implementation waves gated on task 19
- [ ] [`../../STATUS.md`](../../STATUS.md) → wave 1 migration or first implementation task

## Out of scope

- Writing SQL, Surface YAML, DAL, UI
- Wireframes / pixel design
- `party_user` portal spec (defer with identity slice — note in scan only)

## Reference

- [surface-specs/README.md](../surface-specs/README.md)
- [surface-planning-depth.md](../surface-planning-depth.md)
- [child-collections.md](../child-collections.md)
- [decisions/README.md](../decisions/README.md)
