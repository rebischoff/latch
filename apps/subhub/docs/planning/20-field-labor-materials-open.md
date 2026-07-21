# Field — labor progress reports + zone Order (locked)

> **Status:** **Complete / locked** (2026-07-17). **Decisions:** [`job.md`](../decisions/job.md#decision-field--progress-reports--zone-order-compose-2026-07-17), [`procurement.md`](../decisions/procurement.md#decision-field-zone-order--requisition-snapshots-2026-07-17).  
> **Task:** [55 — Field progress reports + zone Order](../tasks/55-field-progress-reports-zone-order.md).  
> **Amends:** Field **F3** (history); R1 compose path (Field primary); task 52 “no geography on req lines.”  
> **Keeps:** Demand → requisition → PO → receipt; remaining / freeze-on-PO / withdraw; CO block on committed material; R4 many headers; R5 PO per job×vendor.

**Why:** Field (51) + requisitions (52) converged on Job → Field as compose for labor snapshots and material requests, with domain documents on Save.

---

## Locked summary (L0–L31)

| ID | Choice |
|----|--------|
| **L0** | One Job → **Field** tab — labor + materials compose |
| **L1** | **Save only** (no Submit) — living board + progress report when progress changed |
| **L2** | Report schedule (daily/weekly/dated) — **noted; impl deferred** |
| **L3** | Notes belong on progress report — **UI deferred this cycle (L24)** |
| **L4** | Issues separate (created→resolved) — **separate required cycle (L31)** |
| **L5–L7** | ☐ **Order** under phases; leaf all-or-nothing; work table informational + PO trail |
| **L8 / L29 / L30** | Order-changing Save → **new** `requested_order` + lines (diff-aware) |
| **L9** | Ad-hoc via **Scope** first — **restored 2026-07-20** ([FI1–FI12](../decisions/job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20); AH1 Field-direct ad-hoc superseded) |
| **L10–L12** | Open editable until PO; re-request OK; keep remaining/withdraw/PO rules |
| **L13** | Domain snapshots **and** `latch_audit` (not redundant) |
| **L15** | No special redact — uncheck + Save |
| **L16** | Progress report = **full board** copy |
| **L17** | `/requisitions` list kept; progress history job-first later |
| **L18** | Soft-spec OK; empty TBD not orderable |
| **L19** | Shared/consumables → General/staging; leaf Order = allocated lines only |
| **L20–L22** | Re-request; Scope vs committed; leaf → BOM qty mapping |
| **L23** | Order default **unchecked** while remaining |
| **L24–L25** | Notes UI + report history UI **deferred** this impl cycle |
| **L26** | New `job_progress_report` + `job_progress_report_cell` |
| **L27** | Order checkbox **derived** from req lines + zone |
| **L28** | `requested_order_line.site_zone_id` (null = General) |
| **L31** | Issues **out of this cycle** — required follow-on |

---

## This implementation cycle (task 55)

**In:** progress report tables + write on Save; Field ☐ Order + PO trail; `site_zone_id` on req lines; new req per Order Save; derive Order state.

**Out:** notes UI; report history UI; issues DB/UI; report scheduling; soft-spec chrome polish; `/requisitions/new` as primary compose (demote; list stays).

---

## Follow-on cycles (required)

| Cycle | Scope |
|-------|--------|
| **Issues** | Per-zone issues + DB; created→resolved (**L4**, **L31**) — **shipped 57**; UI/signal rules amended by [FI1–FI12](../decisions/job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20) / [60](../tasks/60-field-issues-table-revert-adhoc.md) |
| **Progress notes** | Report / per-zone notes (**L3**, **L24**) |
| **Progress report history UI** | List/viewer (**L17**, **L25**) |
| **Report scheduling** | Daily/weekly/dated (**L2**) |

---

## UI (this cycle)

```text
Job → Field
├── Zone tree (left)
└── Selected zone (right)
    ├── Phases — Done (labor)
    ├── ☐ Order — parent↔child like Done
    └── Work / parts — qty, item, part, PO trail
```

Save: progress changed → progress report; Order changed → new requisition.

---

## Related

- [18-job-field-progress.md](./18-job-field-progress.md) · [19-requisition-surfaces-open.md](./19-requisition-surfaces-open.md)
- Tasks [51](../tasks/51-job-field-progress.md), [52](../tasks/52-requisition-surfaces.md), [53](../tasks/53-purchase-order-workbench.md), [55](../tasks/55-field-progress-reports-zone-order.md)
