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
| **A2** | **No as-built staging v1** — publish site on job `complete` (no `job_as_built_change` table) |
| **A1** | **Amended** — v1 `complete` = as-built publish in one step |

## Next open decision

**→ [C2 — part tag storage](#C2)** (then J4, J2, P2, B4, E4).

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

## E4 — `location_confidence`

**What it is:** Optional estimate-level hint — **not required for v1 schema**.

| Value | Meaning |
|-------|---------|
| `none` | Flat quote — no geography |
| `rough` | Note in header only |
| `by_area` | Lines FK areas |
| `by_asset` | Device-specific lines |

**Purpose:** UI warnings only (“3 lines have no area — assign before field progress”). Does not block save or win.

**Open:** Ship field v1 vs defer vs derive from line FKs automatically.

---

## J2 — Progress approval — “huh?”

**Platform context:** SubHub v1 has **no** Latch verification / pending-changes workflow ([`decisions/general.md`](../decisions/general.md)).

**Question:** Should **field progress entries** have their own lightweight status?

| Option | Behavior |
|--------|----------|
| **A — No workflow** | All progress lines count immediately |
| **B — Draft → submitted** | Tech saves draft; lead submits |
| **C — Submitted → approved** | PM approves before progress affects billing % |

**Recommendation for v1:** **A** or **B** only. Billing can still use PM-reviewed **billable** staging separately.

**Status:** Open.

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

## J4 — `job_scope_group` — required?

**What it is:** See [03-jobs-progress.md](./03-jobs-progress.md). Folder for scope items on the job.

| Option | Behavior |
|--------|----------|
| **A — Implicit General** | `job_scope_group_id` nullable; UI shows one default group |
| **B — Required** | Every line must belong to a group |

**Recommendation:** **A** — nullable FK + synthetic General in DTO for flat jobs.

**Status:** Open.

---

## J5 — Phase templates — how does phase get known?

**Flow:**

1. **Catalog:** `item` (or `system_type`) has `phase_template_id`.
2. **Estimate add line:** User picks item → optional preview of phases (UI only).
3. **Win / job line create:** DAL copies template steps → `scope_phase` rows with `planned_qty` = line qty (or split per template rules).
4. **Manual lines:** System default template (e.g. Install → Test → Complete) or single phase.

**Labor lines:** Template may include Program/Test; product-only lines may get Install → Complete only.

**Open:** Single global default template vs per-`system_type` required.

---

## A3 — Batch as-built from progress — **Deferred v1.5**

**Idea (v1.5):** When install `scope_phase` reaches `planned_qty`, DAL drafts `job_as_built_change` rows for PM review.

**v1:** PM runs **complete**; DAL creates/activates assets from scope rules at publish time — no auto-suggest UI.

---

## P2 — `install_target`

**Definition:** The date the **install phase** is expected to need the material on site.

**Used in:** `order_by_date = install_target − vendor_part.lead_time_days`

| Source v1 | |
|-----------|---|
| **Manual** | `scope_phase.target_date` set by PM |
| **Derived** | `job.start_date` + offset per phase sequence |
| **None** | Ready pool disabled; manual PO only |

**Recommendation:** Manual `target_date` on scope phase optional field; derived is v1.5.

**Status:** Open.

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

## B4 — Auto billable v1

**Question:** Ship generator that creates `billable_line` from progress, or manual staging only in first billing wave?

| Option | |
|--------|---|
| **Manual first** | Lower risk; matches deferred 6b |
| **Auto with review** | Creates open billables; PM edits before invoice |

**Recommendation:** Manual billable first wave; auto generator when progress model ships.

**Status:** Open.

## C2 — Part suggestion rules (detail)

| Rule | v1 |
|------|-----|
| Manufacturer assumption set | **Hard filter** — hide non-matching MPNs |
| Color / system_type | **Soft rank** — show compatible first |
| No assumption set | Show all items for `system_type` |
| User pick | Sets `material_status = verified` |

**Open:** Tag storage — `tag_json` vs junction tables vs columns on part.

---

## D1 / D3

See [08-supersedes.md](./08-supersedes.md) and [09-migration-notes.md](./09-migration-notes.md).

---

## Summary — block implementation until resolved?

| ID | Blocks DBML? | Blocks UI? |
|----|--------------|------------|
| J2 | No | Field tab polish |
| J4 | Minor | Job scope UI |
| A2 | ~~Yes~~ **No v1** — publish on `complete`; defer `job_as_built_change` |
| P2 | No — nullable target_date | Ready-to-order pool |
| B4 | No | Billing tab |
| C2 tag shape | Yes — part filter | Estimate pickers |

**Minimum to amend DBML:** ~~J1~~ ✓, ~~A2~~ ✓ (no as-built table v1), **C2** tag shape.
