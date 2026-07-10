# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-09.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**055** authored. Tasks **29–36**, **37a**–**37u**, **37v**, **37w**, **37x**, **37y**, **37z**, **38**, **39** complete.

## Right now — do this next

**Parallel OK:** [37h](./docs/tasks/37a-category-scope-decision-dbml-migration.md) — job `site_zone_id` FK renames.

**Follow-on (deferred from 37x/37y X4):** win → job condition/allocation copy; job unresolved queue (G4).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **03 — Catalog** | Spec types epic | **37t complete** |
| **04 — Estimates** | Condition-only tree | **37y complete** |
| **05 — Jobs** | 5b+ / 37h | Unresolved pool (G4) later; FK renames |

## Recently completed

- **37z — Item commercial inherit UI** — F/I/M on all nodes; child inherit checkbox; no schema change (Z1–Z5) (2026-07-09).
- **37y — Condition-only commercial tree** — drop `estimate_scope`; lines require condition; C inherit checkbox (Y1–Y5) (2026-07-09).
- **Y1–Y5 locked — condition-only commercial tree** — drop `estimate_scope`; lines require condition; C inherit checkbox; author 37y (2026-07-09).
- **37x — Estimate conditions + line allocations** — commercial tree; complexity on condition only; Places/allocations + `qty_manual` (2026-07-09).
- **X1–X4 locked** — block delete; estimate-owned tree (names in C); `qty_manual`; 37x = estimate path only (2026-07-09).
- **G5e locked — D5/D3/D6g/DBML package** — complexity on condition only; author 37x (2026-07-09).
- **G5a–G5d locked** — `estimate_condition`; allocations; S = commercial tree; C binds scope/condition (2026-07-09).
- **Decision G1–G4 — scope / condition / zone / qty** — product meaning locked (2026-07-09).
- **37w — Line Items three-panel layout** — topology retained; S/C content superseded by 37x/37y (2026-07-08).

## Pointers

- [Task 37z — item commercial inherit UI](./docs/tasks/37z-item-commercial-inherit-ui.md) ✅
- [Task 37y — condition-only commercial tree](./docs/tasks/37y-condition-only-commercial-tree.md) ✅
- [Decision — condition-only tree (Y1–Y5)](./docs/decisions/estimate.md#decision-condition-only-commercial-tree-2026-07-09)
- [Task 37x — conditions + allocations](./docs/tasks/37x-estimate-conditions-allocations.md) ✅ (roots superseded by 37y)
- [Schema DBML](./docs/schema/current.dbml)
