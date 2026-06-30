# Open decisions and glossary

> **Status:** Planning (2026-06-27). Resolved items move to domain planning docs + [`decisions/`](../decisions/README.md).

## Resolved in this planning pass

| ID | Decision |
|----|----------|
| S1 | Rename `site_section`/`site_location` → `site_area`/`site_asset` |
| S2 | `site_system` optional; default no-system bucket |
| S3 | Area tree (`parent_area_id`) |
| S4 | `area_type` free text v1 |
| S5 | Assets not tree-like (no `parent_asset_id` v1) |
| E2 | No `estimate_section` v1; subtotal by area/asset |
| E3 | One won estimate → one job |
| P1 | `lead_time_days` on `vendor_part` |
| P3 | Ad-hoc parts on PO allowed |
| A1 | Normally gate job `complete` on as-built applied |
| **J1** | **Replace `job_work_item`** with `scope_phase` + `progress_entry` / `progress_entry_line` (fractional qty) |
| **A2** | **No as-built staging v1** — publish site on job `complete` |
| **C2** | **`system` + `system_spec_def` (UUID) + `estimate_system` tabs; … |
| **J4** | **Implicit General** — `job_scope_group_id` nullable; synthetic General in UI |
| **J5** | **Per `system` default `phase_template`** + optional `item.phase_template_id` override |
| **J2** | **No progress entry workflow** — saved lines count immediately |
| **P2** | **Manual `scope_phase.target_date`** as `install_target` for PO readiness |
| **B4** | **Manual billable staging v1** — no auto generator from progress |
| **E4** | **Defer `location_confidence`** — no column v1; UI derives warnings from line FKs |

## Next step

**Backbone forks resolved.** Tasks **29–32** formalize the DBML → migration → estimate ship path — see [`tasks/01-task-index.md`](../tasks/01-task-index.md). **Active:** [task 30 — surfaces review](../tasks/30-backbone-surfaces-review.md). Optional polish: [J3 — phase weights](#J3) (equal weights OK v1).

---

## C2 — System specs — **Locked (2026-06-27)**

Detail: [06-catalog-trade-system.md](./06-catalog-trade-system.md), [02-estimates.md](./02-estimates.md).

---

---

## A2 — as-built review — **Locked (2026-06-27)**

**Choice: C — Defer staging/review v1.**

| v1 | v1.5+ (deferred) |
|----|------------------|
| No `job_as_built_change` table | Staging + PM review before site write |
| **`job.complete`** publishes site in one transaction | `draft` → `approved` → `applied` workflow |

**On `job.status → complete` (v1 DAL):**

1. Promote surviving **`proposed`** `site_area` / `site_asset` → **`active`** on this job's site.
2. Apply relocations/removals per scope + progress (rules in job complete DAL).
3. Create **`site_asset`** rows from scope items where install phases satisfy policy (see A3 deferred).
4. Do **not** rewrite FKs on closed job scope lines.

**Separate from:** platform verification ([`decisions/general.md`](../decisions/general.md) — no pending changes). This is a domain publish action, not an approval queue.

**Rationale:** Ship site-as-built value without a second workflow surface; add review when bad field data is observed in production.

---

## A1 — As-built before complete — **Amended with A2 (2026-06-27)**

**v1:** There is no separate “as-built applied” step — **`complete` is the publish**. Hard block `complete` only when DAL preconditions fail (e.g. open CO, validation errors) — not a pending review queue.

**v1.5:** Revisit separate apply + optional gate when `job_as_built_change` lands.

---

## J1 — field progress model — **Locked (2026-06-27)**

**Choice: A — Replace.** Drop `job_work_item` from DBML; do not migrate.

| Entity | Role |
|--------|------|
| `scope_phase` | `planned_qty`, `completed_qty` per scope item |
| `progress_entry` | Header — work date, entered_by, notes |
| `progress_entry_line` | `scope_phase_id`, `quantity_completed`, optional `site_area_id` / `site_asset_id` |

- Supersedes [field status — `job_work_item`](../decisions/job.md#decision-field-status--job_work_item-2026-06-17).
- Billing `qty_installed` reads scope phase rollups ([B1](#B1)).
- Detail: [03-jobs-progress.md](./03-jobs-progress.md).

---

## E4 — `location_confidence` — **Locked (2026-06-27)**

**Choice: A — Defer v1.**

| v1 | Behavior |
|----|----------|
| No `estimate.location_confidence` column | Not in schema |
| UI warnings | Derive from line FKs when useful (e.g. lines missing `site_area_id`) |
| Does not block | Save, win, or job copy |

**Deferred v1.5+:** Optional stored enum if PM wants explicit flat vs by-area intent on header.

Detail: [02-estimates.md](./02-estimates.md).

---

## J2 — Progress entry workflow — **Locked (2026-06-27)**

**Choice: A — No workflow.**

| v1 | Behavior |
|----|----------|
| Save | `progress_entry` + lines apply immediately to `scope_phase.completed_qty` |
| No status column | No `draft` / `submitted` / `approved` on progress entries |
| Billing | PM review stays on **`billable_line`** staging — separate from field progress |

**Rationale:** Keep v1 simple; no approval surface until bad field data is observed in production.

Detail: [03-jobs-progress.md](./03-jobs-progress.md).

---

## J3 — `progress_weight` / `billing_weight` on scope phase

When rolling up **job % complete** or **SOV earn %**, phases on one line may matter differently.

**Example:** Install 10 devices — Install phase weight 80%, Test 15%, Complete 5%.

| Option | v1 |
|--------|-----|
| **Equal weight** | Each phase on an item counts equally — simplest |
| **Template defaults** | `phase_template_step` carries default weights |
| **Per-item override** | Editable on each `scope_phase` row |

**Recommendation:** Template defaults with equal fallback.

**Status:** Open — can ship equal weights v1.

---

## J4 — `job_scope_group` — **Locked (2026-06-27)**

**Choice: A — Implicit General.**

- `job_line.job_scope_group_id` **nullable**.
- UI/DTO synthesizes a **“General”** group when null (flat jobs, small service tickets).
- Win from `estimate_system` tabs may create real groups (by area, phase, SOV); not required for every line.

Detail: [03-jobs-progress.md](./03-jobs-progress.md).

---

## J5 — Phase templates — **Locked (2026-06-27)**

**Choice: A — Per `system_id` default + item override.**

| Source | `scope_phase` seed |
|--------|-------------------|
| `item.phase_template_id` | Use item's template when set |
| Else `system.default_phase_template_id` | Fallback per catalog system (FA, Access, …) |
| Manual line, no system context | Org-wide last-resort template (single row in progressive setup) |

**On win / job line create:** DAL copies `phase_template_step` rows → `scope_phase` with `planned_qty` = line `quantity` (unless template defines per-step qty rules later).

**Estimate:** optional phase preview in UI only — `scope_phase` rows created on job.

Detail: [06-catalog-trade-system.md](./06-catalog-trade-system.md), [03-jobs-progress.md](./03-jobs-progress.md).

---

## A3 — Batch as-built from progress — **Deferred v1.5**

**Idea (v1.5):** When install `scope_phase` reaches `planned_qty`, DAL drafts `job_as_built_change` rows for PM review.

**v1:** PM runs **complete**; DAL creates/activates assets from scope rules at publish time — no auto-suggest UI.

---

## P2 — `install_target` — **Locked (2026-06-27)**

**Choice: A — Manual `scope_phase.target_date`.**

```
order_by_date = scope_phase.target_date − vendor_part.lead_time_days
```

| v1 | Behavior |
|----|----------|
| `scope_phase.target_date` | Optional — PM sets when known |
| No target | Line excluded from ready-to-order pool; PO still manual |
| Derived schedule | Deferred v1.5 (`job.start_date` + phase offset) |

**Rationale:** Readiness math without a scheduling engine. PM enters install dates when they know them.

Detail: [04-procurement.md](./04-procurement.md), [03-jobs-progress.md](./03-jobs-progress.md).

---

## B1 — Billing reads scope phases — **Locked with J1 (2026-06-27)**

Billing `qty_installed` generator reads **`scope_phase.completed_qty`** rollups (weighted per J3 when set), not `job_work_item`.

**Action:** Amend [`decisions/billing.md`](../decisions/billing.md) when billing wave implements generator.

---

## B2 — `sov_allocation` FKs

**Today:** `job_line_id` + org `phase_id`.

**Planned:** Add `job_scope_group_id`, `scope_phase_id`; prefer group-level allocation for SOV milestones.

**Open:** Migration of existing SOV data (none in prod); whether to keep `phase_id` FK for legacy rows.

---

## B3 — `billable_line` = “billing application”

**Yes.** No new table. Workflow:

1. DAL creates/updates `billable_line` (open).
2. User selects on job Billing tab.
3. Issue invoice → `invoice_line.billable_line_id`; billable → `on_invoice`.

---

## B4 — Auto billable v1 — **Locked (2026-06-27)**

**Choice: A — Manual first.**

| v1 | Behavior |
|----|----------|
| `billable_line` | PM creates/edits staging rows by hand |
| `billing_basis = qty_installed` | No auto generator from `scope_phase` rollups |
| `manual` | Primary path in first billing wave (6b) |
| Auto generator | Deferred until progress model is in production |

**Rationale:** Lower risk for first billing wave; progress → billable automation ships later.

Detail: [05-billing.md](./05-billing.md).

---

## D1 / D3

See [08-supersedes.md](./08-supersedes.md) and [09-migration-notes.md](./09-migration-notes.md).

---

## Summary — block implementation until resolved?

| ID | Blocks DBML? | Blocks UI? |
|----|--------------|------------|
| J2 | ~~No~~ ✓ — no status column | Field tab |
| J4 | ~~Minor~~ ✓ — nullable `job_scope_group_id` |
| A2 | ~~Yes~~ **No v1** — publish on `complete`; defer `job_as_built_change` |
| P2 | ~~No~~ ✓ — optional `scope_phase.target_date` | Ready-to-order pool |
| B4 | ~~No~~ ✓ — manual staging only | Billing tab |
| C2 | ~~Yes~~ ✓ locked | Estimate pickers |

**Minimum to amend DBML:** ~~J1~~ ✓, ~~A2~~ ✓, ~~C2~~ ✓, ~~J4~~ ✓, ~~J5~~ ✓, ~~J2~~ ✓, ~~P2~~ ✓, ~~B4~~ ✓, ~~E4~~ ✓ — **proceed with DBML pass.** J3 (weights) optional — equal weights OK v1.
