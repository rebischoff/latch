# 16 — Slice 2 planning gate

> **Status:** Complete (2026-06-16). Next: [17-schema-design-pass.md](./17-schema-design-pass.md) *(completed)* → [18-surface-catalog.md](./18-surface-catalog.md). Migration spec: [deferred/site-migration.md](./deferred/site-migration.md).

## Goal

Lock the remaining **Slice 2 product choices** that affect task **17** (migration) and tasks **18–19** (surfaces / UI). **Docs only** — decision blocks + task index updates; no DDL.

## Prerequisites

[15-entity-flow.md](./15-entity-flow.md) complete (entity flow in [`architecture.md`](../architecture.md)).

## Files

| File | Action |
|------|--------|
| [`../decisions/README.md`](../decisions/README.md) | **Update** — dated Decision block(s) for each locked choice below |
| [`01-task-index.md`](./01-task-index.md) | **Update** — Slice 2 exit criteria / task 18–19 headlines if scope shifts |
| [`deferred/site-migration.md`](./deferred/site-migration.md) | Migration spec (was `18-site-migration.md`) |

## Choices to lock (stop gate)

Resolve each item with a **Decision** block in `decisions.md`:

### 1. `site_contact_relation` catalog at migrate time

| Option | Implication |
|--------|-------------|
| **A — Empty catalog** | Task 17 creates table only; first relations added via admin UI or later approved seed |
| **B — DDL default rows** | Task 17 `INSERT`s standard relations (Property owner, Property manager, Site superintendent, Other); requires explicit [seeding discussion](../decisions/cross-cutting.md#decision-business-data-seeding-2026-06-15) |

### 2. `party_location` on `contact_detail`

| Option | Implication |
|--------|-------------|
| **A — Slice 2** | Task 18–19 or a task **20** includes `party_location` child collection on contacts |
| **B — Follow-up after sites UI** | Slice 2 exit = sites only; `party_location` UI in a later task |

### 3. Junction `purpose` on `party_location` (confirm)

Confirm task **17** keeps CHECK constraint on `party_location.purpose`. No `site_location` table — sites are logical only; in-building scope on estimate/job ([decision](../decisions/site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17).

### 4. Headline scope for tasks 18–19 (no full task files yet)

One paragraph in `01-task-index.md` or `decisions.md`: what `site_list` / `site_detail` must deliver for Slice 2 exit (contacts collection per [child-collections.md](../child-collections.md)).

## Steps

1. Review [entity flow](../architecture.md) against [decisions.md](../decisions/README.md); list any open forks.
2. Decide items **1–4** above; add Decision block(s) with date **2026-06-15** or later.
3. Update migration spec ([`deferred/site-migration.md`](./deferred/site-migration.md)) so steps match (especially relation catalog seeding).
4. Update Slice 2 row in [`01-task-index.md`](./01-task-index.md) if exit criteria or task count changes.

## Verify (stop gate)

- [x] Decision locked: `site_contact_relation` empty vs default rows → **empty** ([slice 2 gate](../decisions/site.md#decision-slice-2-ui-scope--planning-gate-2026-06-16))
- [x] Decision locked: `party_location` in Slice 2 vs follow-up → **deferred** (task 20; DDL in task 17)
- [x] `party_location.purpose` CHECK documented; no `site_location` table
- [x] Tasks **18–19** headline scope recorded (index + decisions)
- [x] Migration spec consistent with decisions → [`deferred/site-migration.md`](./deferred/site-migration.md)
- [x] [`../../STATUS.md`](../../STATUS.md) → surface catalog ([`18-surface-catalog.md`](./18-surface-catalog.md))

## Out of scope

- Writing `018` / `019` SQL
- Surface YAML, DAL, UI
- Planning slices 3–7 beyond what entity flow already shows

## Reference

- [15-entity-flow.md](./15-entity-flow.md)
- [deferred/site-migration.md](./deferred/site-migration.md)
- [child-collections.md](../child-collections.md)
