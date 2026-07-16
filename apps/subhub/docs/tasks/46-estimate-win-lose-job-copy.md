# 46 — Estimate win / lose → job copy (wave 5b, thick)

> **Status:** Complete (2026-07-15). Next: [48](./48-job-create-front-doors-condition-drift.md) → [49](./49-change-order-surfaces.md) (or 5c Field in parallel).
>
> **Decision:** [estimate win → job handoff (W0–W7 + Scope-U1/E1/F1/S1)](../decisions/estimate.md#decision-estimate-win--job-handoff-2026-07-14). **Companion:** [`job.md`](../decisions/job.md#decision-estimate-win--job-handoff-2026-07-14). **Amends:** E3 one-job-per-win → **one job per catalog scope** (S2a). **Depends on:** [45](./45-job-costing-and-change-order-reconciliation.md) (CO model; 5d Surfaces still later). **Supersedes:** phantom **37h** (job FK renames — already landed in 033/045; see below).

**Out of scope:** Change-order Surfaces (**5d**); Field progress entry UI (**5c**); Billing tab; procurement beyond BOM seed; retiring colloquial “Job Scope” tab label; shared mega estimate/job form.

---

## Locked summary (do not re-litigate)

| # | Choice |
|---|--------|
| **W0** | Vocabulary A — catalog scope / condition / site zone / job group / phase |
| **W1a** | One job per **catalog scope** per estimate; `job.catalog_scope_item_id`; `UNIQUE (estimate_id, catalog_scope_item_id)` |
| **W1b** | After job delete, recreate missing catalog-scope slice(s); estimate stays `won` |
| **W1c** | Second estimate on same site → C1-guided (new job(s) vs add-on/CO) |
| **W2** | Copy matrix **M2** — header, stakeholders×N, lines, `job_line_spec` |
| **W3** | Copy **editable** `job_condition*`; live costing; **sold price frozen**; sold vs current cost compare |
| **W4** | `job_line_allocation` carry-forward; job-editable places |
| **W5** | Seed **phases + BOM** when possible (**P1**) |
| **W6** | Toolbar **Win** / **Lose** / **Create job** actions (not status+Save); multi-job → first job + links (navigate **U1**) |
| **W7** | **Thick 5b** — handoff + engineer UI |
| **Scope-U1** | Job Scope = estimate-parity **S / C / LI** (not a thin table) |
| **Scope-E1** | Add @ `sold_unit_price = 0`; delete $0 OK; delete sold $>0 → CO deduct (**5d**) |
| **Scope-F1** | Freeze on sold lines: **unit_price / sold_***, **quantity**, **description**; editable: conditions, part, places, live cost — **amended by [47](./47-job-line-items-parity.md)** (dual qty; working `quantity` editable) |
| **Scope-S1** | Job-specific Scope shell; reuse shared helpers; **YAGNI** (no mega shared form) |

> **Naming:** **Scope-U1** (Job Scope topology) ≠ W6 navigate **U1** (first job after multi-win).

---

## Goal

Ship estimate **Win** / **Lose** / recreate and an **estimate-parity Job Scope** engineer loop (condition tree + config + line items): live vs sold costing, places, add/delete under **Scope-E1**, freeze under **Scope-F1** — so ops can run after sale without waiting on 5c/5d.

**Exit:** Win on a multi–catalog-scope estimate creates N jobs; Lose marks lost; Create job fills missing slices; job Scope mirrors estimate S/C/LI with sold/current cost + place edit + Scope-E1/F1 rules; tests + STATUS complete.

---

## 37h — obsolete

**37h** (job FK renames in the 37a chain) is **cancelled / superseded**:

- `job_line.site_area_id` → `site_zone_id` already in migration **033**
- `job_line.phase_id` dropped in **045**; DAL stubs `phase_id: null`
- Live job code already uses `site_zone_id`

Do **not** author a 37h task. Optional drive-by: remove leftover DTO `phase_id` compat and stale `architecture.md` geography wording (can fold into 46 Step 1 docs).

---

## Execution order

```mermaid
flowchart TD
  s1[1 DBML + migration]
  s2[2 Win/lose/recreate DAL]
  s3[3 Estimate actions API + UI]
  s4[4 Job condition + line + allocation DAL]
  s5[5 Job Scope UI estimate-parity]
  s6[6 Tests + STATUS]
  s1 --> s2 --> s3 --> s4 --> s5 --> s6
```

---

## Step 1 — DBML + migration

| File / area | Action |
|-------------|--------|
| `docs/schema/current.dbml` | `job.catalog_scope_item_id`; UNIQUE `(estimate_id, catalog_scope_item_id)`; `job_condition*` (mirror estimate condition shape); `job_line_allocation`; sold snapshot columns on `job_line` (`sold_unit_price`, `sold_unit_cost`, sold cost buckets as needed); `job_line.job_condition_id` if lines bind to job conditions |
| `migrations/0NN_*.sql` | Apply above; backfill none required for empty jobs |
| `docs/architecture.md` / planning win section | Align with S2a + W0 vocabulary; note 37h obsolete |

### Verify

- [x] DBML + migration apply clean on dev
- [x] UNIQUE enforces one job per (estimate, catalog scope)

---

## Step 2 — Win / lose / recreate DAL

| File / area | Action |
|-------------|--------|
| `lib/estimates/repository/estimate-win.ts` (new) | `winEstimate` — partition lines by catalog scope root; create N jobs; copy per W2–W5; set `status = won` |
| | `loseEstimate` — `status = lost` |
| | `recreateMissingJobs` — W1b for missing slices |
| Tests | Single-scope win; multi-scope N jobs; second win conflict per slice; lose; recreate; C1-guided is UI (DAL accepts explicit proceed) |

### Verify

- [x] Multi-scope estimate → N jobs with partitioned lines + stakeholders on each
- [x] Sold snapshots set; conditions + allocations + BOM/phases seeded per W3–W5
- [x] Structured conflicts for duplicate slice / bad status

---

## Step 3 — Estimate actions API + UI

| File / area | Action |
|-------------|--------|
| API | `POST .../win`, `/lose`, `/create-job` (or Surface action routes) — re-resolve `win`/`lose` grants |
| `EstimateDetailForm` | Toolbar Win / Lose / Create job; confirms; W1c dialog when site has active job; after win navigate W6 **U1** |

### Verify

- [x] Win/Lose not via status+Save
- [x] Multi-job toast/links; Create job when slice missing

---

## Step 4 — Job engineer DAL

| File / area | Action |
|-------------|--------|
| Job detail related | Load/replace `conditions`, `line_items` (+ allocations), cost summary with **sold vs current** |
| Costing | Shared engine against `job_condition*`; never overwrite sold price / sold snapshot from engineering recalc |
| Place write | Replace `job_line_allocation` independently of estimate |
| Line add/delete | Enforce **Scope-E1**: new lines `sold_unit_price = 0`; reject delete when sold $ > 0 (point at CO for **5d**) |

### Verify

- [x] Knob/line changes recompute current cost buckets; sold_* unchanged
- [x] New engineering lines default sold price 0; delete of sold $>0 rejected

---

## Step 5 — Job Scope UI (estimate-parity)

Mirror estimate Scope topology (**Scope-U1**). Prefer a **job-specific** shell that reuses shared helpers (**Scope-S1**) — e.g. condition tree, place popover, costing — not a thin `job_line` table and not a mega shared form with mode flags.

| Panel | Behavior |
|-------|----------|
| **S — Conditions** | Job condition forest (editable knobs / labor-only / discontinued / complexity) — estimate-parity C-panel sibling |
| **C — Config** | Selected condition detail (specs, labor phases, etc.) |
| **LI — Line items** | Lines with **sold vs current** cost columns/summary; place edit; add/delete per **Scope-E1**; freeze sold$/qty/description per **Scope-F1** |
| **Overview** | Keep cost summary; link source estimate + catalog scope label |

Reference: `components/estimates/EstimateLineItemsPanels.tsx` (shape to match, not necessarily import wholesale).

### Verify

- [x] Job Scope shows **S / C / LI** like estimate Scope (not table-only)
- [x] Engineer can tweak condition knobs and see current vs sold cost; sold$/qty/description frozen on sold lines
- [x] Add line → sold $0; delete $0 OK; delete sold $>0 blocked (message → CO)
- [x] Places editable; unassigned lines assignable
- [x] Manual smoke: win multi-scope estimate → open jobs → edit place + condition → costs move, sold price does not

---

## Step 6 — Close out

| File | Action |
|------|--------|
| This task | Status Complete; all verify `[x]` |
| `STATUS.md` | Recently completed; next → 5c or product pick |
| `01-task-index.md` | 46 complete; 37h cancelled |

### Verify

- [x] Task + indexes + STATUS updated
- [x] 37h marked obsolete in 37a chain + STATUS pointers

---

## Related

- [Decision — win → job handoff](../decisions/estimate.md#decision-estimate-win--job-handoff-2026-07-14)
- [45 — job costing + CO](./45-job-costing-and-change-order-reconciliation.md)
- [23 — job wave 5a](./23-job-wave-5a.md)
- [37a — 37h cancelled](./37a-category-scope-decision-dbml-migration.md#follow-on-chain-37b37h)
