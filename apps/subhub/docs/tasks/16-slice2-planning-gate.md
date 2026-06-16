# 16 — Slice 2 planning gate

## Goal

Lock the remaining **Slice 2 product choices** that affect task **17** (migration) and tasks **18–19** (surfaces / UI). **Docs only** — decision blocks + task index updates; no DDL.

## Prerequisites

[15-entity-flow.md](./15-entity-flow.md) complete (entity flow in [`architecture.md`](../architecture.md)).

## Files

| File | Action |
|------|--------|
| [`../decisions.md`](../decisions.md) | **Update** — dated Decision block(s) for each locked choice below |
| [`01-task-index.md`](./01-task-index.md) | **Update** — Slice 2 exit criteria / task 18–19 headlines if scope shifts |
| [`17-site-migration.md`](./17-site-migration.md) | **Update** — align migration steps with locked choices (e.g. relation catalog seeding) |

## Choices to lock (stop gate)

Resolve each item with a **Decision** block in `decisions.md`:

### 1. `site_contact_relation` catalog at migrate time

| Option | Implication |
|--------|-------------|
| **A — Empty catalog** | Task 17 creates table only; first relations added via admin UI or later approved seed |
| **B — DDL default rows** | Task 17 `INSERT`s standard relations (`property_owner`, `property_manager`, …); requires explicit [seeding discussion](../decisions.md#decision-business-data-seeding-2026-06-15) |

### 2. `party_location` on `contact_detail`

| Option | Implication |
|--------|-------------|
| **A — Slice 2** | Task 18–19 or a task **20** includes `party_location` child collection on contacts |
| **B — Follow-up after sites UI** | Slice 2 exit = sites only; `party_location` UI in a later task |

### 3. Junction `purpose` enums (confirm)

Confirm task **17** keeps CHECK constraints on `site_location.purpose` and `party_location.purpose` (not catalog tables) — or record a Decision to use catalogs instead.

### 4. Headline scope for tasks 18–19 (no full task files yet)

One paragraph in `01-task-index.md` or `decisions.md`: what `site_list` / `site_detail` must deliver for Slice 2 exit (locations + contacts collections per [child-collections.md](../child-collections.md)).

## Steps

1. Review [entity flow](../architecture.md) against [decisions.md](../decisions.md); list any open forks.
2. Decide items **1–4** above; add Decision block(s) with date **2026-06-15** or later.
3. Update [`17-site-migration.md`](./17-site-migration.md) so migration steps match (especially relation catalog seeding).
4. Update Slice 2 row in [`01-task-index.md`](./01-task-index.md) if exit criteria or task count changes.

## Verify (stop gate)

- [ ] Decision locked: `site_contact_relation` empty vs default rows
- [ ] Decision locked: `party_location` in Slice 2 vs follow-up
- [ ] `purpose` on junctions: CHECK vs catalog — documented
- [ ] Tasks **18–19** headline scope recorded (index or decisions)
- [ ] `17-site-migration.md` consistent with decisions
- [ ] [`../../STATUS.md`](../../STATUS.md) → [17-site-migration.md](./17-site-migration.md)

## Out of scope

- Writing `018` / `019` SQL
- Surface YAML, DAL, UI
- Planning slices 3–7 beyond what entity flow already shows

## Reference

- [15-entity-flow.md](./15-entity-flow.md)
- [17-site-migration.md](./17-site-migration.md)
- [child-collections.md](../child-collections.md)
