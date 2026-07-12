# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-07-11.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** Migrations **037**–**058** authored. Tasks **29–36**, **37a**–**37z**, **37aa**, **37ac**, **38**, **39** complete; **37ab** superseded/reverted by **37ac**.

## Right now — do this next

**[37h](./docs/tasks/37a-category-scope-decision-dbml-migration.md)** — job `site_zone_id` FK renames (parallel OK). Win → job condition/allocation copy; job unresolved queue (G4).

## Blockers

- _(none)_

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| **03 — Catalog** | Spec types epic | **37ac complete** — mount variance = leaf duplication (single `parent_id`) |
| **04 — Estimates** | Live line preview + dual locks | **37aa complete** |
| **05 — Jobs** | 5b+ / 37h | Unresolved pool (G4) later; FK renames |

## Recently completed

- **37ac — Revert item placement + mount axis** — dropped `item_placement`/`item_cost_override`/`commercial_axis`/variant/`implies`; migration 058; `resolveRate` back to D4 (2026-07-11).
- **37ab reverted** — item placement + mount axis override (M1–M7, L1–L6) superseded same-day by leaf-duplication decision (R1–R6); revert tracked as **37ac** (2026-07-11).
- **37ab Steps 1–3** *(historical, reverted)* — placement + commercial axis (migration/DAL + catalog UI); picker decode without seed (2026-07-11).
- **37aa — Estimate line live preview + dual locks** — `sales_locked` / `material_locked`; migration 056; server batch preview on item/part/config (2026-07-11).
- **37aa decisions locked (P1–P7)** — dual locks + live preview; task authored (2026-07-11).
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

- [Task 37ac — revert placement + mount axis](./docs/tasks/37ac-item-placement-mount-axis-revert.md) ✅
- [Task 37ab — placement + mount axis](./docs/tasks/37ab-item-placement-mount-axis.md) — **superseded/reverted**, historical only
- [Task 37aa — line live preview + dual locks](./docs/tasks/37aa-estimate-line-live-preview.md) ✅
- [Decision — dual locks + live preview (P1–P7)](./docs/decisions/estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11)
- [Task 37z — item commercial inherit UI](./docs/tasks/37z-item-commercial-inherit-ui.md) ✅
- [Task 37y — condition-only commercial tree](./docs/tasks/37y-condition-only-commercial-tree.md) ✅
- [Decision — condition-only tree (Y1–Y5)](./docs/decisions/estimate.md#decision-condition-only-commercial-tree-2026-07-09)
- [Task 37x — conditions + allocations](./docs/tasks/37x-estimate-conditions-allocations.md) ✅ (roots superseded by 37y)
- [Schema DBML](./docs/schema/current.dbml)
