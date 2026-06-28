# Operations backbone

> **Status:** Planning (2026-06-27)

## One-sentence definition

**Site** is the living as-built. **Estimate** prices work. **Job** executes scope and reports progress. **Procurement** buys materials. **Billing** invoices earned revenue. Each layer stays separate; they link by FK, not by merging tables.

## Spine

```
SITE (source of truth — what exists now)
  Site
    → Site System (optional — FA, CCTV, Access, …)
        → Site Area (tree per system or default bucket)
            → Site Asset (installed serviceable device)

ESTIMATE (sales)
  Estimate
    → system_assumption (per site_system — manufacturer, type, …)
    → Estimate Line (flat array; UI may group by area/asset)

JOB (operations — v1 work order)
  Job
    → Job Scope Group
        → Job Scope Item (sold line)
            → Scope Phase (Install / Test / …; fractional qty)
    → Progress Entry → Progress Entry Line

PROCUREMENT
  Job Line Part → Requested Order → PO → Receipt → job-site stock

BILLING
  SOV Line → SOV Allocation → scope group / item / phase
  Billable Line → Invoice
```

## Separations (load-bearing)

| ≠ | Why |
|---|-----|
| Job Scope Group ≠ work order | Dispatch WO is v2 |
| Job Scope Group ≠ `site_area` | Production vs as-built |
| `site_area` ≠ estimate commercial section | Place vs proposal layout (section dropped v1) |
| Scope phase ≠ site asset status | Job % complete vs what exists on site |
| Change order ≠ as-built change | Contract $ vs site registry |
| Progress entry ≠ site publish | Field report vs master update on `complete` |
| SOV line ≠ job scope item | Billing vs production |
| `job_line_part` ≠ `site_asset` | What to buy vs what's installed |

## End-to-end flow

1. **Estimate** at `site_id`; optional `site_system_id`; assumptions narrow parts; lines may FK `site_area` / `site_asset` or stay flat.
2. **Win** → **job** copies scope; site `proposed` rows unchanged.
3. **Job** — progress on scope phases; materials via requisition/PO when ready.
4. **CO** when sold qty/$ changes.
5. **Job `complete`** → publish site (`proposed` → `active`, create assets) — v1, no review queue.
6. **Billing** — SOV/line progress → billable → invoice.

## V1 vs deferred

| V1 | Deferred |
|----|----------|
| Site system / area tree / asset | System topology (loops, zones on drawings only) |
| Per-system assumptions + part tags | Cross-system “one Floor 1” registry |
| Job scope groups, scope phases, progress entries | Work orders / dispatch |
| Requisition → PO; lead time on `vendor_part` | Org warehouse WMS |
| Billable → invoice; SOV allocations | Payment ledger, AIA G702/G703 |
| Job `complete` publishes site (proposed → active) | `job_as_built_change` review (v1.5); `site_audit` timeline |

## Document map

| Doc | Topic |
|-----|--------|
| [01-site-as-built.md](./01-site-as-built.md) | Area tree, assets, lifecycle |
| [02-estimates.md](./02-estimates.md) | Assumptions, line shape, win |
| [03-jobs-progress.md](./03-jobs-progress.md) | Scope, progress, CO, as-built |
| [04-procurement.md](./04-procurement.md) | PO, lead time |
| [05-billing.md](./05-billing.md) | SOV, billable, invoice |
| [06-catalog-trade-system.md](./06-catalog-trade-system.md) | Trade, system type, part tags |
| [07-open-decisions.md](./07-open-decisions.md) | Unresolved forks |
