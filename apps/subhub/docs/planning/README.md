# SubHub — operations backbone planning

> **Status:** Planning (2026-06-27). Locks the estimate → job → as-built → billing → procurement model before DBML amendment and migrations.
>
> **Supersedes** parts of [`decisions/site.md`](../decisions/site.md), [`decisions/estimate.md`](../decisions/estimate.md), and [`decisions/job.md`](../decisions/job.md) — see [08-supersedes.md](./08-supersedes.md).

## Start here

1. [00-backbone.md](./00-backbone.md) — spine diagram, separations, V1 vs V2
2. Domain plans (read in order for entity flow):
   - [01-site-as-built.md](./01-site-as-built.md)
   - [02-estimates.md](./02-estimates.md)
   - [03-jobs-progress.md](./03-jobs-progress.md)
   - [04-procurement.md](./04-procurement.md)
   - [05-billing.md](./05-billing.md)
   - [06-catalog-trade-system.md](./06-catalog-trade-system.md)
3. [07-open-decisions.md](./07-open-decisions.md) — unresolved forks + glossary for planning questions
4. [08-supersedes.md](./08-supersedes.md) — which prior decisions this plan amends
5. [09-migration-notes.md](./09-migration-notes.md) — DBML / migration approach (D3) → tasks [29](../tasks/29-backbone-dbml-pass.md)–[32](../tasks/32-estimate-wave-4e.md)
6. [11-categories-scope-model.md](./11-categories-scope-model.md) — **locked 2026-06-30** — category roots replace catalog `system` ([37a](../tasks/37a-category-scope-decision-dbml-migration.md))
7. [12-master-detail-chrome.md](./12-master-detail-chrome.md) — **planning 2026-07-01** — shared toolbar + create navigation ([38](../tasks/38-master-detail-chrome.md)); categories create fix follows Layer 2
8. [13-toolbar-chrome.md](./13-toolbar-chrome.md) — **planning 2026-07-02** — slot-based toolbar communication ([39](../tasks/39-toolbar-chrome-slots.md)); category New child parent id
9. [14-site-estimate-zone-unification.md](./14-site-estimate-zone-unification.md) — **§§ 1–3 shipped (42a/42b/42c, 2026-07-14)**; asset-level history deferred
10. [15-job-costing-and-change-orders.md](./15-job-costing-and-change-orders.md) — **locked 2026-07-14** — budget/committed/actual/margin layers; re-budget vs. CO; CO ↔ BOM ↔ scope phase reconciliation ([45](../tasks/45-job-costing-and-change-order-reconciliation.md))
11. [16-estimate-job-co-boundaries.md](./16-estimate-job-co-boundaries.md) — **locked 2026-07-15** — as-sold via estimate Win; Jobs New kept; CO Surfaces separate; condition drift; mid-job progress ([48](../tasks/48-job-create-front-doors-condition-drift.md), [49](../tasks/49-change-order-surfaces.md))
12. [17-service-warranty-tm-open.md](./17-service-warranty-tm-open.md) — **open / parked 2026-07-15** — T&M, fixed service, warranty tickets, blank-job Add condition (SW0–SW5); do not implement until locked
13. [18-job-field-progress.md](./18-job-field-progress.md) — **complete 2026-07-16** — Field tab 5c; task [51](../tasks/51-job-field-progress.md)
14. [19-requisition-surfaces-open.md](./19-requisition-surfaces-open.md) — **complete 2026-07-16** — wave 6a requisition/PO Surface UX (R1–R8); locked in [procurement.md](../decisions/procurement.md)
15. [20-field-labor-materials-open.md](./20-field-labor-materials-open.md) — **locked 2026-07-17** — Field progress reports + zone Order; task [55](../tasks/55-field-progress-reports-zone-order.md); issues follow-on required

## Locked at a glance (2026-06-27)

| Area | Choice |
|------|--------|
| Site | `site` → optional `site_system` → `site_area` (tree) → `site_asset` (leaf device) |
| Site system | **Not required** — areas/assets may live under a default no-system bucket |
| Estimates | Per-system **assumptions** narrow part suggestions; geography optional; **no `estimate_section` v1** |
| Win | One won estimate → one job; site `proposed` until job **`complete`** publishes |
| Job | Job = work order v1; scope group → scope item → scope phase → progress entries |
| Procurement | `vendor_part.lead_time_days`; ad-hoc parts on PO allowed |
| Billing | Three layers unchanged; SOV allocations extend to scope groups/phases |
| Job costing | Budget/committed/actual(material)/margin are DAL rollups; `job_line_cost_revision` re-budget event; CO approve reconciles `job_line_part` + `scope_phase` |

## Related

- Locked decisions (dated blocks): [`decisions/`](../decisions/README.md)
- Schema draft (pre-amendment): [`schema/current.dbml`](../schema/current.dbml)
- Architecture summary: [`architecture.md`](../architecture.md)
