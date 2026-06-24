# Surface implement specs — index

> **Active task:** [22-estimate-wave-4a.md](../tasks/22-estimate-wave-4a.md) — wave 4a estimate implementation.  
> **Discovery:** [20-ui-discovery.md](../tasks/20-ui-discovery.md) — **complete** (2026-06-23).  
> **Spec task:** [19-surface-implement-specs.md](../tasks/19-surface-implement-specs.md) — **16/27**; **`job-party-relation.md`** ✅; next catalog specs (#15–18).  
> **Field map (catalog tier):** [`surfaces.md`](../surfaces.md) — task 18.

## What this is

| Layer | Doc | Status |
|-------|-----|--------|
| Data model | [`schema/current.dbml`](../schema/current.dbml) | Complete for v1 |
| Field catalog | [`surfaces.md`](../surfaces.md) | Complete (task 18) |
| **Implement specs — checkpoint** | Rows **#1–14** | ✅ CRM hub + sites + part |
| **UI discovery** | [task 20](../tasks/20-ui-discovery.md), [`spikes/`](../spikes/README.md) | **Complete** (2026-06-23) |
| **Implement specs — remaining** | Rows **#15–18**, **#22–28** | ⬜ in progress |
| Production code | migrations, YAML, DAL, UI | **Sites slice** ✅ · **Estimate wave 4a** next |

One file per Surface group (see [00-scan.md](./00-scan.md)). Template: [`_template.md`](./_template.md).

## How to work (paused conveyor)

Task 19 **resume order** (after task 20 step 4):

1. **`job-billing-fields.md`** (row #27) — when billing wave approaches
2. **`item.md`** (row #15) — catalog pickers for 4d′ / Scope
3. **`item.md`** (row #15) — when catalog pickers need depth
4. Remaining catalog tables (#16–18), procurement (#22–25), invoice (#26), notes (#28)

**Rhythm for ops Surfaces:** Spike or ship thin UI → planning session → fill A–K in spec → fold decisions into DBML + `decisions/`.

For catalog Surfaces not blocked on spikes: discuss in chat → spec → decisions (same as IAM / party thread).

## Checkpoint rows (complete)

IAM, party lenses, contact retire, site, site-contact-relation, party-addresses, site-geography, part — see [00-scan.md](./00-scan.md).

## Related

- [`surface-planning-depth.md`](../surface-planning-depth.md) — process map + A–K checklist
- [`tasks/20-ui-discovery.md`](../tasks/20-ui-discovery.md) — **what to build now**
