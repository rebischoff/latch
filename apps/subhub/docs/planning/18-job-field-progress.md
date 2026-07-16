# Job Field progress (wave 5c) — locked product plan

> **Status:** **Complete** (2026-07-16). **Decision:** [`decisions/job.md`](../decisions/job.md#decision-job-field-progress--boolean-zone-snapshot-5c-2026-07-16). **Task:** [51 — Field progress (5c)](../tasks/51-job-field-progress.md) — **Complete**.  
> **Orthogonal to:** [49](../tasks/49-change-order-surfaces.md) (5d CO Surfaces) — either order.  
> **Out of this wave:** as-built publish / Complete toolbar; tech-only Field Surface; auto billable from progress (B4); `progress_entry*` history UI.

## Why

Jobs → Field today is an explore fixture (`JobFieldExplorePanels`). Ops need a **persisted** “where are we?” snapshot for the job and for **manual** invoice staging — not a visit ledger and not “fully billed.”

---

## Locked summary (F1–F9)

| # | Topic | Choice |
|---|--------|--------|
| **F1** | Granularity | **Boolean** complete / not per labor phase (no partial qty in Field UI) |
| **F2** | Geography tag | **`site_zone_id` only** on progress geography; drop stale `site_area_id`; no `site_asset_id` on Field writes |
| **F3** | History | **No progress history in v1** — mutable current snapshot only; billing reads snapshot when creating invoices |
| **F4** | Zone tree | **Allocations → zones** + pseudo **General** (rename of Unplaced); **no All Zones**; one scope category per job (base = that category root) |
| **F5** | Surface Field | Dedicated **`field_progress`** on `job_detail` (drop obsolete `work_items` / `job_work_item`) |
| **F6** | Save | **Whole-job Save/Revert** with other tabs; later **tech-only Surface** reuses same write model (not in 5c) |
| **F7** | Wave scope | **Progress only** — no Complete / as-built publish in 5c |
| **Lifecycle** | Status labels | **Derived** (except cancel): see below |
| **F8** | Job % | **Hours-weighted**, **computed on read — never stored** |
| **F9** | Denominator | **Include General**; **active** lines only after CO void; boolean ⇒ no over-complete qty |

### Lifecycle (derived + cancel)

| State | Rule |
|-------|------|
| **Not started** | progress = 0%, not cancelled |
| **Cancelled** | explicit; **only when progress = 0%**; locks Field writes |
| **In progress** | 0% &lt; progress &lt; 100% |
| **Stale** | overlay on in-progress — quiet / may never finish (**threshold TBD** at task authoring) |
| **Completed** | progress = 100% — **≠** 100% billed |

**TBD resolved in [51](../tasks/51-job-field-progress.md):** stale = 30 days without Field write; cancel only at progress = 0%.

---

## Persistence shape

### Do not use for v1 Field product path

- **`progress_entry` / `progress_entry_line`** — remain in DBML for a possible later visit ledger; **not** written by 5c Field UI.
- Stored job `%` or stored lifecycle string (except **cancelled**).

### Do write

Field is zone × phase boolean. `scope_phase` is **per `job_line`**, so a line with multiple places cannot store Door-12-only Install on `scope_phase` alone.

**Write model:** complete flags keyed by **`(scope_phase_id, geography)`** where geography is `site_zone_id` **or** General (`site_zone_id` null + general sentinel). Collection Field id: **`field_progress`**.

Optional denormalization: roll completed allocation slices into `scope_phase.completed_qty` for readers that already expect it — **% and lifecycle still derived**, not stored on `job`.

### Delete guards (unchanged / confirm)

- **`site_zone`**: block delete while referenced (allocations, conditions, assets, …).
- **Catalog `labor_phase`**: `ON DELETE RESTRICT` while `scope_phase` (etc.) references it.
- Job **`scope_phase`**: do not hard-delete when progress/complete flags exist; CO revise voids + carries (JC6).

---

## % formula (F8)

\[
\% = \frac{\sum \text{hours of completed phase-slices}}{\sum \text{hours of all countable phase-slices}}
\]

- Hours per slice = catalog/seeded phase hours × qty for that geography (allocation qty, or full line qty on General).
- Checkbox complete ⇒ that slice’s full hours count as done.
- Countable = phases on **active** job lines, including **General**.
- Equal phase-count (1 of 3) is **rejected** unless every slice happens to share the same hours profile.

---

## UI (job_detail Field tab)

| Element | Behavior |
|---------|----------|
| Zone tree | Category root (one per job) → zones that appear on active allocations → **General** |
| No | **All Zones** aggregator |
| Phase columns | Union of labor phases for work under the selected node |
| Cascade | Parent check cascades to descendant leaves that have that phase; child uncheck → parent indeterminate |
| Create | Field stays gated until job is saved (existing stub) |
| Save | Dirty with whole-job toolbar (F6) |

Replace explore fixtures in `JobFieldExplorePanels` with real job/site data.

---

## Spec / schema follow-through (task)

| Area | Action |
|------|--------|
| `job.md` surface spec | Add `field_progress`; remove `work_items` / `job_work_item` wording |
| YAML | Grant `field_progress` read/write; keep `complete` action undeclared-as-UI until publish wave |
| DBML | Prefer `site_zone_id` on any Field geography FK; note `progress_entry*` deferred for product; add junction/table notes for zone×phase complete if not expressible on `scope_phase` alone |
| Overview / list | Show derived lifecycle + optional % (read model) |
| Cancel | Overview (or toolbar) when progress = 0% |

---

## Explicitly deferred

| Item | Notes |
|------|--------|
| As-built publish / Complete | Separate task; not auto at 100% |
| Tech Field Surface | Same `field_progress` writes; narrow manifest |
| Progress entry history | Possible later; not v1 |
| Auto `billable_line` from % | B4 still deferred |
| **Stale threshold days** | Pinned in [51](../tasks/51-job-field-progress.md): **30 days** |
| Device-level Field | `site_asset` status stays separate |

---

## Related

- [03-jobs-progress.md](./03-jobs-progress.md) — earlier progress model
- [16-estimate-job-co-boundaries.md](./16-estimate-job-co-boundaries.md) — JC6 progress vs CO
- [07-open-decisions.md](./07-open-decisions.md) — J1/J2/J3 (J3 → hours-weighted for display %)
- Explore: `components/jobs/JobFieldExplorePanels.tsx`
