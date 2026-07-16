# Job costing and change-order reconciliation

> **Status:** Locked (2026-07-14). **Decisions:** [`decisions/costing.md`](../decisions/costing.md) (cost layers, re-budget), [`decisions/job.md`](../decisions/job.md#decision-change-order--bom-and-scope-phase-reconciliation-2026-07-14) (CO ↔ BOM ↔ scope phase). **Task:** [45](../tasks/45-job-costing-and-change-order-reconciliation.md).

## Why this doc exists

`job_line` already snapshots contract price and cost; `job_line_part` is the engineered BOM; a change-order design already existed ([2026-06-17](../decisions/job.md#decision-change-orders--unified-job_line-ledger-2026-06-17)) but only covered the sold-line ledger. Three things were missing before a PM could actually run a job financially:

1. **No view of budget vs. committed vs. actual vs. margin** — every number needed already exists as a column somewhere except material *actual* cost.
2. **No way to revise anticipated cost internally** without either faking a change order or silently overwriting `unit_cost`.
3. **Change order approve had no rule for BOM/progress fallout** — `deduct` / `revise` could orphan open requisitions on already-bought material, or erase completed field work.

This doc locks the model for all three. **No implementation lands with this pass** — see [Sequencing](#sequencing).

## Cost layers

| Layer | Formula | New storage? |
|-------|---------|---------------|
| **Contract** | `Σ job_line.unit_price × quantity` (`status = active`) | None |
| **Budget** | `Σ job_line.unit_cost × quantity` (`status = active`) | None |
| **Re-budgeted** | Latest `job_line_cost_revision.new_unit_cost` per line, else falls back to budget | `job_line_cost_revision` (new table) |
| **Committed** | `Σ purchase_order_line.unit_cost × quantity`, open/ordered/partial, via `job_line_part_id` | None (rollup) |
| **Actual (material)** | `Σ material_receipt_line.unit_cost × quantity` | `material_receipt_line.unit_cost` (new column) |
| **Actual (labor)** | — | **Deferred** — no timesheet/crew-time entity v1 |
| **Margin** | Contract − (Budget \| Re-budgeted \| Actual), reported side by side | None |

Only **two** schema changes fall out of this: `job_line_cost_revision` (new table) and `material_receipt_line.unit_cost` (new column). Everything else is a DAL rollup computed at read time — no parallel cost ledger that can drift from the lines it summarizes. Detail: [`decisions/costing.md`](../decisions/costing.md#decision-job-costing--budget--committed--actual--margin-layers-2026-07-14).

## Re-budget vs. change order

An internal cost correction (material got more expensive, a labor estimate was wrong) is **not** a change order — it doesn't touch `unit_price` and the customer never sees it. It also isn't a bare `PATCH job_line.unit_cost`, because that leaves no queryable trail beyond an opaque audit blob.

| | Change order | Re-budget |
|---|---|---|
| Changes | Contract scope + `unit_price` (customer-facing) | `unit_cost` only (internal) |
| Table | `change_order` / `change_order_line` | `job_line_cost_revision` (new) |
| Visible to customer | Yes (signed CO) | No |
| Triggers | Scope addition / deduction / revision | Cost discovery, vendor price change, estimate error |
| Effect on margin | Changes both budget and contract $ | Erodes (or improves) margin only |

Full shape + rejected alternatives: [`decisions/costing.md`](../decisions/costing.md#decision-re-budget--job_line_cost_revision-distinct-from-change-order-2026-07-14).

## Change order reconciliation (BOM + scope phase)

The 2026-06-17 CO decision locked what happens to `job_line` on approve (`add` → new line; `deduct` → void; `revise` → void + replacement). It never addressed the two child structures that hang off a scope item: the engineered BOM (`job_line_part`) and field progress (`scope_phase` / `progress_entry_line`).

| `line_action` | `job_line` (unchanged) | `job_line_part` (BOM) | `scope_phase` / progress |
|---|---|---|---|
| **`add`** | New `job_line` | New BOM explosion — same path as manual line add / win-copy | New `scope_phase` rows seeded same as any new line (37n resolver) |
| **`deduct`** | Target `job_line.status = voided` | Void/cancel associated `job_line_part` rows | Void `scope_phase` rows |
| **`revise`** | Target voided; new replacement `job_line` (`superseded_by_job_line_id`) | Old line's BOM voided; replacement gets a fresh BOM explosion — do not diff-patch old rows | New `scope_phase` rows on replacement; **carry forward `completed_qty`** proportionally from the superseded line's phases (matched by `name` / `sequence`) so a revise never erases real field progress |

**Guardrails (block vs. warn):**

| Condition | Rule |
|-----------|------|
| `deduct` / `revise` target has `job_line_part` rows already `on_purchase_order` / `received` (per procurement rollup) | **Block approve** with a structured conflict — can't un-buy delivered/committed material without a separate procurement decision (return-to-vendor, keep-as-surplus). Approver resolves procurement first, then re-approves the CO. |
| `deduct` / `revise` target has `scope_phase.completed_qty > 0` on any phase | **Warn, don't block** — completed field work stays true. `deduct` still voids the phase, but existing `progress_entry_line` rows are never deleted (audit trail of real work done, even on a line later cut from contract). |

**Rationale:** Building change orders (wave 5d) without these rules risks orphaned open requisitions (deduct a line that's already been bought) or silently erased field progress (revise a line that's half-installed). Locking this now, before 5d starts, avoids relitigating it mid-implementation. Detail: [`decisions/job.md`](../decisions/job.md#decision-change-order--bom-and-scope-phase-reconciliation-2026-07-14).

## Sequencing

Implementation landed with task **45** (migration **075** + DAL + Overview cost panel). Remaining:

1. **[48](../tasks/48-job-create-front-doors-condition-drift.md)** — as-sold / Jobs New copy + complexity drift (JC1–JC2/JC5).
2. **[49](../tasks/49-change-order-surfaces.md) — Change order Surfaces (5d)** — draft/edit CO UI calling `approveChangeOrder` / `previewChangeOrderApprove`.
3. **Mount** `ChangeOrderApproveGuardsAlert` on approve confirmation (ships with **49**).
4. **Procurement tables** — committed / actual(material) rollups light up when PO + receipt DDL ships; `unit_cost` column is already conditional in **075**.
5. **5c** Field progress UI — orthogonal; can ship before or after **49**.

Boundaries: [16-estimate-job-co-boundaries.md](./16-estimate-job-co-boundaries.md) (JC1–JC7).

## Out of scope (this pass and v1 generally)

- Labor hours/$ actuals — no timesheet/crew-time entity.
- WIP / percent-complete revenue recognition, cost-code/GL mapping.
- Automatic vendor-return workflow when a CO deduct is blocked on committed material — PM resolves manually via existing procurement Surfaces.
- CO-level margin-delta UI — the rollup capability is locked here; the UI wave is TBD.

## Related

- [00-backbone.md](./00-backbone.md)
- [03-jobs-progress.md](./03-jobs-progress.md) — scope phase / progress model this reconciles against
- [04-procurement.md](./04-procurement.md) — requisition / PO / receipt chain `job_line_part` feeds
- [`decisions/job.md`](../decisions/job.md#decision-change-orders--unified-job_line-ledger-2026-06-17) — original CO decision this amends
- [`decisions/costing.md`](../decisions/costing.md)
- [Task 45](../tasks/45-job-costing-and-change-order-reconciliation.md)
