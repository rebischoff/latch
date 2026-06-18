# 18 — Surface & Field catalog

> **Status:** Complete (2026-06-17). Next: [19-surface-implement-specs.md](./19-surface-implement-specs.md).

## Goal

Produce a **design-complete** Surface & Field catalog for SubHub v1 — one canonical doc mapping every screen-shaped policy boundary to Fields, routes, and delivery wave. Resolve open UI decisions before resuming DDL and Surface YAML.

**Docs only** — no migrations, no `*.surface.yaml`, no DAL/UI in this task.

## Prerequisites

[17-schema-design-pass.md](./17-schema-design-pass.md) complete. Skim [`current.dbml`](../schema/current.dbml) and [`architecture.md`](../architecture.md#entity-flow).

## Files

| File | Action |
|------|--------|
| [`../surfaces.md`](../surfaces.md) | **Create / iterate** — canonical catalog (draft started 2026-06-17) |
| [`../decisions/README.md`](../decisions/README.md) | **Update** — lock or defer each [open decision](../surfaces.md#open-decisions) |
| [`../architecture.md`](../architecture.md) | **Update** — point Surface catalog section at `surfaces.md` |
| [`01-task-index.md`](./01-task-index.md) | **Update** — planning phase + implementation waves |
| [`../../STATUS.md`](../../STATUS.md) | Repoint **Right now** to this task |

**Preserved (deferred, not deleted):** [`deferred/site-migration.md`](./deferred/site-migration.md) — wave 1 DDL spec from former task 18.

## Steps

### 1. Review draft catalog

Walk [`surfaces.md`](../surfaces.md) against [`current.dbml`](../schema/current.dbml):

- Every business anchor has list + detail (or catalog table) entry
- [Not a Surface](../surfaces.md#not-a-surface) table list is complete
- Collection Fields match [`child-collections.md`](../child-collections.md) patterns

### 2. Resolve open decisions (O1–O7)

For each row in [Open decisions](../surfaces.md#open-decisions):

- Pick a direction or explicitly defer with rationale
- Add dated **Decision** block in the matching [`decisions/`](../decisions/README.md) domain file
- Update affected Surface entries in `surfaces.md`

**Minimum for exit:** O1 (party nav shape), O3 (estimate line editor), O6 (site geography wave).

### 3. Mark shipped vs planned deltas

Document Slice 1 interim (`contact_list` / `contact_detail` / `/contacts`) and wave **1** retirement: type lens pairs, no `roles` Field, add/remove role actions.

### 4. Re-cut implementation waves

Confirm [Implementation waves](../surfaces.md#implementation-waves) in `01-task-index.md`:

1. Wave 1 — [`deferred/site-migration.md`](./deferred/site-migration.md) + site Surfaces/DAL/UI
2. Waves 2–7 — headline task placeholders per wave (no full task files required at exit)

### 5. Cross-check roles

Skim [app roles](../architecture.md#app-roles-future-catalog) — each wave's Surfaces are grantable without orphan screens.

## Verify (stop gate)

- [x] [`surfaces.md`](../surfaces.md) covers all Surfaces in architecture headline table + Fields per detail Surface
- [x] [Not a Surface](../surfaces.md#not-a-surface) documented
- [x] Open decisions O1 resolved ([party list/detail](../decisions/party.md#decision-party-listdetail-surface-shape-2026-06-16-locked-2026-06-17))
- [x] O1 lens model locked — no `/contacts`, no `roles` picker ([decision](../decisions/party.md#decision-party-listdetail-surface-shape-2026-06-16-locked-2026-06-17))
- [x] Open decisions O2 resolved ([party profile](../decisions/party.md#decision-party-profile-fields-on-type-lenses-2026-06-17), [notes/attachments](../decisions/cross-cutting.md#decision-notes-and-attachments--shared-tables-deferred-2026-06-15))
- [x] Open decisions O3 resolved ([estimate/job line grouping](../decisions/estimate.md#decision-estimate--job-line-grouping--site-geography-2026-06-17))
- [x] Open decisions O4 resolved ([`job_detail` tabs](../decisions/job.md#decision-job_detail-layout--tabbed-2026-06-17))
- [x] Open decisions O5 resolved ([SOV on `job_detail`](../decisions/billing.md#decision-sov-ui--nested-on-job_detail-billing-tab-2026-06-17))
- [x] Open decisions O7 resolved ([employee marker / HR later](../decisions/party.md#decision-employee_detail-scope--marker-now-hr-later-2026-06-17))
- [x] Shipped vs wave-1 delta noted (retire `contact_*`, add type `{role}_detail` lenses) — [surfaces.md § Wave 0](../surfaces.md#wave-0--party--contacts)
- [x] [`01-task-index.md`](./01-task-index.md) shows planning complete → wave 1 implementation
- [x] [`deferred/site-migration.md`](./deferred/site-migration.md) linked as wave 1 migration entry point
- [x] [`../../STATUS.md`](../../STATUS.md) → wave 1 migration or next wave task

## Out of scope

- Writing `migrations/018+` SQL ([`deferred/site-migration.md`](./deferred/site-migration.md))
- Surface YAML, codegen, DAL, UI
- Wireframes or pixel design

## Reference

- [surfaces.md](../surfaces.md) — deliverable
- [architecture.md](../architecture.md) — entity flow
- [child-collections.md](../child-collections.md) — collection Field pattern
- [16-slice2-planning-gate.md](./16-slice2-planning-gate.md) — prior slice-2 UI locks (fold into catalog)
