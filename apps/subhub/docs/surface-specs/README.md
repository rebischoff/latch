# Surface implement specs — index

> **Active task:** [20-ui-discovery.md](../tasks/20-ui-discovery.md) (implementation + spikes).  
> **Spec task:** [19-surface-implement-specs.md](../tasks/19-surface-implement-specs.md) — **paused** at checkpoint **13/27**; resume at **`estimate.md`** after discovery planning session.  
> **Field map (catalog tier):** [`surfaces.md`](../surfaces.md) — task 18.

## What this is

| Layer | Doc | Status |
|-------|-----|--------|
| Data model | [`schema/current.dbml`](../schema/current.dbml) | Complete for v1 |
| Field catalog | [`surfaces.md`](../surfaces.md) | Complete (task 18) |
| **Implement specs — checkpoint** | Rows **#1–14** | ✅ CRM hub + sites + part |
| **UI discovery** | [task 20](../tasks/20-ui-discovery.md), [`spikes/`](../spikes/README.md) | **Active** |
| **Implement specs — remaining** | Rows **#15–28** | ⬜ after discovery |
| Production code | migrations, YAML, DAL, UI | **Sites slice + spikes** (task 20) |

One file per Surface group (see [00-scan.md](./00-scan.md)). Template: [`_template.md`](./_template.md).

## How to work (paused conveyor)

Task 19 **resume order** (after task 20 step 4):

1. **`estimate.md`** (row #20) — from spike + planning session
2. **`job.md`**, **`job-billing-fields.md`** — especially if job tab spike runs next
3. **`item.md`** (row #15) — when catalog pickers need depth
4. Remaining catalog tables (#16–18), procurement (#22–25), invoice (#26), notes (#28)

**Rhythm for ops Surfaces:** Spike or ship thin UI → planning session → fill A–K in spec → fold decisions into DBML + `decisions/`.

For catalog Surfaces not blocked on spikes: discuss in chat → spec → decisions (same as IAM / party thread).

## Checkpoint rows (complete)

IAM, party lenses, contact retire, site, site-contact-relation, party-addresses, site-geography, part — see [00-scan.md](./00-scan.md).

## Related

- [`surface-planning-depth.md`](../surface-planning-depth.md) — process map + A–K checklist
- [`tasks/20-ui-discovery.md`](../tasks/20-ui-discovery.md) — **what to build now**
