# Surface implement specs — index

> **Active task:** [19-surface-implement-specs.md](../tasks/19-surface-implement-specs.md).  
> **Field map (catalog tier):** [`surfaces.md`](../surfaces.md) — task 18.  
> **This folder:** **implement tier** — DAL, policy, UI, lifecycle per Surface.

## What this is

| Layer | Doc | Status |
|-------|-----|--------|
| Data model | [`schema/current.dbml`](../schema/current.dbml) | Complete for v1 |
| Field catalog | [`surfaces.md`](../surfaces.md) | Complete (task 18) |
| **Implement specs** | **`surface-specs/*.md`** | **In progress (task 19)** |
| Code | migrations, YAML, DAL, UI | **Blocked** until task 19 exits |

One file per Surface group (see [00-scan.md](./00-scan.md)). Template: [`_template.md`](./_template.md).

## How to work

**Rhythm:** Discuss each Surface group in chat at implement depth (fields, policy, DAL, UI, edge cases) — then write the spec and fold decisions into DBML + `decisions/`. Example: IAM identity thread → [party identity](../decisions/party.md#decision-party-identity--party_person-login-link-2026-06-18). **No migrations/UI until task 19 exits.**

1. Read [00-scan.md](./00-scan.md) — inventory + progress table.
2. Pick the next ⬜ row; copy `_template.md` → named file.
3. Fill **A–K** using DBML, `surfaces.md`, `decisions/`, `child-collections.md`, shipped code where relevant.
4. Mark ✅ in scan table; patch `surfaces.md` if catalog gaps found.
5. Repeat until all rows ✅.

**Exit:** Task [19](../tasks/19-surface-implement-specs.md) verify gate — then implementation waves (migration → YAML → DAL → UI).

## Checklist reference

[`surface-planning-depth.md`](../surface-planning-depth.md#2-surface-planning-depth-checklist) — A–K areas.
