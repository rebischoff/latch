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
5. [09-migration-notes.md](./09-migration-notes.md) — DBML / migration approach (D3)

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

## Related

- Locked decisions (dated blocks): [`decisions/`](../decisions/README.md)
- Schema draft (pre-amendment): [`schema/current.dbml`](../schema/current.dbml)
- Architecture summary: [`architecture.md`](../architecture.md)
