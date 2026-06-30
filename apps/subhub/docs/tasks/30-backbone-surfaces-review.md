# 30 — Backbone surfaces review (pre-migration gate)

> **Status:** Complete (2026-06-29). **Next:** [31-estimate-backbone-migrations.md](./31-estimate-backbone-migrations.md).
>
> **Planning:** [`planning/09-migration-notes.md`](../planning/09-migration-notes.md) step 3 · **Prerequisite:** [29-backbone-dbml-pass.md](./29-backbone-dbml-pass.md) ✅

## Goal

Confirm **existing shipped Surfaces and code** still codegen-clean; document **what must change** before estimate backbone migrations ([task 31](./31-estimate-backbone-migrations.md)). **Docs + verify only** — no DDL in this task.

**Short-term driver:** finish **estimates** on the new backbone model ([task 32](./32-estimate-wave-4e.md)).

## Prerequisites

- Task [29](./29-backbone-dbml-pass.md) complete — [`current.dbml`](../schema/current.dbml) amended.
- Task [22](./22-estimate-wave-4a.md) shipped — flat estimate UI on legacy columns.

## What shipped

| Deliverable | Purpose |
|-------------|---------|
| `npm run codegen:check` | Baseline — YAML unchanged must still pass |
| Impact matrix | Specs + code paths vs new table/column names |
| [`schema/README.md`](../schema/README.md) | Coverage table refreshed to 2026-06-29 target |
| [`09-migration-notes.md`](../planning/09-migration-notes.md) | Link to task chain |

**Out of scope:** SQL migrations; DAL/UI rewrites (tasks 31–32).

---

## Step 1 — Impact matrix

> **Status:** Complete (2026-06-29).

**What:** Inventory stale references to legacy schema in specs, tasks, and shipped code.

| Area | Files to review | Backbone delta |
|------|-----------------|----------------|
| **Site geography** | [`site-geography.md`](../surface-specs/site-geography.md), [`site.md`](../surface-specs/site.md), `site_detail` YAML | `sections`/`locations` → `systems`/`areas`/`assets` |
| **Estimate** | [`estimate.md`](../surface-specs/estimate.md), `lib/estimates/**`, estimate components | `estimate_system` tabs; `site_area_id`/`site_asset_id`; drop `estimate_section` |
| **Job** | [`job.md`](../surface-specs/job.md), `lib/jobs/**` | `scope_phase` model; drop `job_work_item` refs in docs |
| **Catalog** | [`surfaces.md`](../surfaces.md), task index wave 3c | New `system` / spec / phase-template Surfaces TBD |
| **Migrations shipped** | `019_site.sql`, `021_estimate.sql`, `023_job.sql` | Breaking rename batch planned in task 31 |

**Exit:** Matrix below; no unresolved **estimate-blocker** forks.

### Surface summary

| Surface / module | Shipped? | Blocker for estimate 4e? | Action in task |
|------------------|----------|--------------------------|----------------|
| `site_detail` | Yes (flat) | No for flat estimate lines | Geography Fields deferred to post-4e wave (wave 2b) |
| `estimate_detail` | Yes | **Yes** | Task 32 — DAL + YAML + UI |
| `job_detail` | Shell only | No | Docs only until 5c |
| `part_detail` | Yes | No (pickers optional in 4e) | — |
| `manufacturer_detail` | In progress (25) | No | Pause OK — parallel track |

### Shipped SQL (legacy — task 31)

| Migration | Legacy artifacts | Backbone target |
|-----------|------------------|-----------------|
| `019_site.sql` | `site_section`, `site_location` | `site_area`, `site_asset` + `site_system` |
| `021_estimate.sql` | `estimate_section`; `estimate_line.estimate_section_id`, `site_location_id` | `estimate_system` + spec tables; `estimate_system_id`, `site_area_id`, `site_asset_id`, `material_status` |
| `023_job.sql` | `job_line.site_location_id` | `job_scope_group_id`, `site_area_id`, `site_asset_id` |

### Surface YAML (codegen baseline)

| File | Legacy refs? | Notes |
|------|--------------|-------|
| `modules/site/site_detail.surface.yaml` | **No** | Wave 1 only — no geography Fields yet |
| `modules/estimate/estimate_detail.surface.yaml` | **No** | Logical `line_items` only; DAL owns column map |
| `modules/job/job_detail.surface.yaml` | **No** | Overview tab only (wave 5a) |

`npm run codegen:check` passes on current YAML — expected; backbone columns land in task 32 YAML pass.

### Shipped app code (task 32 rewrites)

| Path | Legacy columns / tables | Task |
|------|-------------------------|------|
| `lib/estimates/descriptors/estimate-detail.ts` | `estimate_section_id`, `site_location_id` | 32 |
| `lib/estimates/repository/estimate-lines.ts` | same | 32 |
| `lib/estimates/repository/estimate-lines-write.ts` | `site_location` table guard + column INSERTs | 32 |
| `components/estimates/EstimateDetailForm.tsx` | line row mapping | 32 |
| `components/estimates/EstimateLineItemsField.tsx` | row shape defaults | 32 |
| `lib/jobs/descriptors/job-detail.ts` | `site_location_id` on line schema | 32 or 5c |
| `lib/jobs/repository/job-lines.ts`, `job-lines-write.ts` | `site_location_id` | 32 or 5c |

**Spike / dev-only (not production gate):** `components/estimates/EstimateLineEditorSpike.tsx`, `estimate-spike-fixtures.ts` — update when grouped editor ships (wave 4c) or retire spike.

### Docs (stale vocabulary — refresh in task 32 spec pass or parallel doc sweep)

| Doc | Stale terms | When |
|-----|-------------|------|
| [`surfaces.md`](../surfaces.md) § Not a Surface | `site_section`/`site_location`, `estimate_section`, `job_work_item` | 32 spec pass |
| [`surface-specs/estimate.md`](../surface-specs/estimate.md) | `estimate_section`, `site_location_id`, `quote_sections` | 32 |
| [`surface-specs/site.md`](../surface-specs/site.md), [`site-geography.md`](../surface-specs/site-geography.md) | `sections`/`locations` Field ids | wave 2b |
| [`architecture.md`](../architecture.md) | entity table + mermaid still show legacy geography | after 31 or doc sweep |
| [`decisions/estimate.md`](../decisions/estimate.md), [`catalog.md`](../decisions/catalog.md) | pre-backbone locked answers | superseded by [`planning/`](../planning/) — annotate in 32 |

### Catalog / new Surfaces (TBD — not estimate 4e blockers)

| Backbone table | Surface | Wave |
|----------------|---------|------|
| `system`, `system_spec_def`, `system_spec_option` | `system_table` or `system_detail` | 3c+ |
| `phase_template`, `phase_template_step` | catalog table page | 3c+ |
| `trade` | `trade_table` | 3c+ |

### Fork check

**Estimate path clear:** task 31 DDL (additive + one breaking site rename) → task 32 DAL/UI on `estimate_system` tabs and backbone line FKs. Flat wave-4a UX can ship without `site_detail` geography Fields. No open **estimate-blocker** forks.

---

## Step 2 — Codegen baseline

> **Status:** Complete (2026-06-29).

**What:** Run `npm run codegen:check` from `apps/subhub`. Record pass/fail.

**Result:** **Pass** — `codegen: check passed` (2026-06-29). YAML unchanged; no schema-driven codegen drift yet.

---

## Step 3 — Refresh schema README

> **Status:** Complete (2026-06-29).

**What:** Update [`schema/README.md`](../schema/README.md) coverage table to match amended `current.dbml` (site_area, estimate_system, scope_phase, …).

**Exit:** No `site_section` / `job_work_item` in coverage table.

---

## Step 4 — Stop gate

**What:** Confirm pre-migration gate; repoint STATUS to task 31.

**Verify:**

- [x] Impact matrix complete — estimate path clear
- [x] `codegen:check` passes
- [x] [`schema/README.md`](../schema/README.md) coverage updated
- [x] [`planning/09-migration-notes.md`](../planning/09-migration-notes.md) links task 29–32
- [x] [`../../STATUS.md`](../../STATUS.md) → [31-estimate-backbone-migrations.md](./31-estimate-backbone-migrations.md)

---

## Reference

- [29-backbone-dbml-pass.md](./29-backbone-dbml-pass.md)
- [31-estimate-backbone-migrations.md](./31-estimate-backbone-migrations.md)
- [32-estimate-wave-4e.md](./32-estimate-wave-4e.md)
