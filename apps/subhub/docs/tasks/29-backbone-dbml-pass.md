# 29 — Backbone DBML pass (planning → schema)

> **Status:** Complete (2026-06-29). **Next:** [30-backbone-surfaces-review.md](./30-backbone-surfaces-review.md).
>
> **Planning:** [`planning/09-migration-notes.md`](../planning/09-migration-notes.md) steps 1–2 · [`planning/README.md`](../planning/README.md) · **Schema:** [`current.dbml`](../schema/current.dbml)

## Goal

Lock the **2026-06-27 operations backbone** in [`current.dbml`](../schema/current.dbml) before estimate migrations or Surfaces work. **DBML + planning alignment only** — no `migrations/*.sql` in this task.

**Supersedes** parts of task [17](./17-schema-design-pass.md) slice definitions — see [`planning/08-supersedes.md`](../planning/08-supersedes.md).

## Prerequisites

- [`planning/`](../planning/) folder locked (S1–S5, C2, J1–J5, E2–E4, B4, P1–P2, A2).
- Task [22](./22-estimate-wave-4a.md) shipped on **legacy** DDL (`site_section` / `site_location`, `estimate_section`) — this pass amends the **target** schema only.

## What shipped

| Area | DBML change |
|------|-------------|
| **Site** | `site_system`, `site_area`, `site_asset` replace `site_section` / `site_location` |
| **Catalog** | `system`, `trade`, `system_spec_def`, `system_spec_option`, `manufacturer_part_spec`, `phase_template`, `phase_template_step`; `vendor_part.lead_time_days`; `item.phase_template_id` |
| **Estimate** | `estimate_system` + spec tables; `estimate_line` → `estimate_system_id`, `site_area_id`, `site_asset_id`, `material_status`; **`estimate_section` removed** |
| **Job** | `job_scope_group`, `scope_phase`, `progress_entry` / `progress_entry_line`, `job_*_spec`; **`job_work_item` dropped** |
| **Billing / procurement** | `sov_allocation` + `billable_line` → `scope_phase` / `job_scope_group`; line geography FKs updated |

**Deferred v1.5:** `job_as_built_change` — not in DBML.

## Steps

### Step 1 — Planning docs locked

> **Status:** Complete (2026-06-27).

**What:** Resolve backbone forks in [`planning/07-open-decisions.md`](../planning/07-open-decisions.md); amend domain [`decisions/`](../decisions/README.md) blocks.

**Exit:** Planning README + 08-supersedes accurate.

### Step 2 — Amend `current.dbml`

> **Status:** Complete (2026-06-29).

**What:** Apply [`planning/09-migration-notes.md`](../planning/09-migration-notes.md) table groups — site, catalog, estimate, job, procurement, billing; update all `Ref:` lines.

| Files | Action |
|-------|--------|
| [`docs/schema/current.dbml`](../schema/current.dbml) | Amended per migration notes |
| Header comment | Planning pass dated |

**Exit:** DBML parses; no stale `site_section` / `job_work_item` / `estimate_section` **tables** in target schema.

**Out of scope:** dbdiagram layout; numbered SQL; Surface YAML.

---

## Verify (stop gate)

- [x] Planning pass resolved items documented in [`07-open-decisions.md`](../planning/07-open-decisions.md)
- [x] `current.dbml` — site_area / site_asset / site_system (not section / location)
- [x] `current.dbml` — estimate_system + spec tables; no `estimate_section` table
- [x] `current.dbml` — scope_phase + progress_entry; no `job_work_item` table
- [x] `current.dbml` — catalog `system` + spec defs + phase templates
- [x] All new tables have `Ref:` lines
- [x] [`../../STATUS.md`](../../STATUS.md) → [30-backbone-surfaces-review.md](./30-backbone-surfaces-review.md)

## Reference

- [17-schema-design-pass.md](./17-schema-design-pass.md) — first DBML pass (2026-06-16)
- [schema/README.md](../schema/README.md) — DBML workflow (update coverage in task 30)
