# Estimate / job / CO commercial boundaries

> **Status:** Locked (2026-07-15). **Decision:** [`decisions/job.md` — JC1–JC7](../decisions/job.md#decision-estimate--job--co-commercial-boundaries-2026-07-15). **Companion:** [`decisions/estimate.md`](../decisions/estimate.md#decision-estimate--job--co-commercial-boundaries-2026-07-15). **Tasks:** [48](../tasks/48-job-create-front-doors-condition-drift.md), [49](../tasks/49-change-order-surfaces.md). **Depends on:** [15](./15-job-costing-and-change-orders.md), win handoff W0–W7, JLI-1…7.

## Why this doc exists

Wave **5b** shipped win-copy and estimate-parity Job Scope. Product still needed boundaries for:

1. Jobs sold / contracted **outside** SubHub  
2. Whether **Jobs → New** remains  
3. Whether **change orders** should reuse `estimate` rows vs keep `change_order_*`  
4. Mid-job **condition** edits vs **CO** line reconciliation and **field progress** history  

This doc records the locked answers so **48** / **5d (49)** do not re-litigate them.

## Front doors

```text
Sold / contracted project
  └─ Estimate (rebuild as-sold if needed) ──Win──► Job (sold_* frozen)

Service / warranty / blank project shell
  └─ Jobs → New ──► Job (estimate_id null; Scope @ sold $0)

Contract change on live job
  └─ Change order ──Approve──► job_line void / add / revise (+ BOM / phases per 45)
```

| Path | Plants sold contract $? |
|------|-------------------------|
| Estimate Win / Create-job | Yes |
| Jobs → New | No (engineering / T&M / warranty until CO) |
| CO approve | Yes (add / revise); removes via void |

**Parked follow-ons (not locked):** T&M end-to-end, fixed/NTE service, warranty ticket fields, blank-job Add condition — see [17-service-warranty-tm-open.md](./17-service-warranty-tm-open.md).

## CO vs estimate (UX reuse, not table merge)

| | Estimate | Change order |
|--|----------|--------------|
| Anchor | Site (+ quote) | **Existing job** |
| Apply | **Win** → create job(s) | **Approve** → mutate `job_line` |
| Lines | `estimate_line` | `change_order_line` + `line_action` + `target_job_line_id` |
| UI | `estimate_detail` S/C/LI | `change_order_detail` S/C/LI — **shared helpers** |

Rejected: `estimate.type = change_order`; one Surface with mode flags.

## Job Scope after CO / condition edits

| Intent | Mechanism |
|--------|-----------|
| Complexity / phases / specs wrong; **sold $ unchanged** | Edit `job_condition*` — live cost moves; flag complexity ≠ `complexity_factor_id_at_win` |
| Customer contract $ / sold qty / sold scope changes | CO add / deduct / revise |
| Working grid | `job_line.status = active` only — never zero-hide |
| Field progress after revise/deduct | Keep `progress_entry*`; void phases; carry matching `completed_qty` ([45](../tasks/45-job-costing-and-change-order-reconciliation.md) C5–C6) |

### Example — prewire done, install removed mid-job

1. Tech reports prewire complete at zones (progress entries).  
2. Install dropped from contract → **CO revise** on that line.  
3. Approve: old line voided; replacement without Install; Prewire `completed_qty` carried; Install phase voided with history retained; warn if progress existed.  
4. Job Scope LI shows the active replacement only.

## Sequencing

| Task | Deliverable |
|------|-------------|
| **48** | Docs already locked here; migration `complexity_factor_id_at_win`; win seed; C badge; Jobs New / as-sold copy |
| **49** | Wave **5d** — `change_order_*` Surfaces + shared commercial helpers + approve UI on [45](../tasks/45-job-costing-and-change-order-reconciliation.md) DAL |
| **5c** | Field progress entry UI (orthogonal; can ship before or after 49) |

## Related

- [15-job-costing-and-change-orders.md](./15-job-costing-and-change-orders.md)
- [03-jobs-progress.md](./03-jobs-progress.md)
- [decisions/job.md](../decisions/job.md)
- [decisions/estimate.md](../decisions/estimate.md#decision-estimate-win--job-handoff-2026-07-14)
