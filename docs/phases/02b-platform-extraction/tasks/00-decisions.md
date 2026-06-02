# 00 — Lock platform-extraction decisions

## Goal

Record the generic boundary, the `@latch/policy` loader and `@latch/dal` kernel contracts, the consumer homes, the test/tooling moves, and the `apps/web` retirement so tasks 02–06 do not re-debate them. **Docs only — do not add or move code.**

## Prerequisites

None beyond Phase 01 complete + Phase 02 task 00 locked. First task in this phase.

## Files (docs only)

| File | Action |
|------|--------|
| [`../decisions.md`](../decisions.md) | Confirm Decided table + Decision blocks (policy contract, DAL kernel contract, homes/tooling) |
| [`../../../foundations/open-questions.md`](../../../foundations/open-questions.md) | Add Resolved row: genericization pulled forward (in-repo) |
| [`../../../foundations/scope.md`](../../../foundations/scope.md) | Note: `apps/web` retired; `apps/crm` is the sole app (Decision block) — light pointer, full sweep in `05` |
| [`../STATUS.md`](../STATUS.md) | After verify: **Execute now** → `02-policy-generic.md` |

## Decisions to confirm (see [`../decisions.md`](../decisions.md))

1. **Boundary** — `@latch/*` carry no consumer domain; `packages/**` must not import `apps/**`.
2. **Sole consumer** — `apps/crm`; `apps/web` retired.
3. **Policy** — injected metadata registry, not hardcoded `surfaces/*.ts`; `resolve()` semantics unchanged.
4. **DAL** — generic `createSurfaceDal(descriptor, store, deps)`; jobs wiring moves to `apps/crm`.
5. **Homes** — `apps/crm/modules` (metadata), `apps/crm/migrations` (DDL), `apps/crm` (schema/seed/store/wiring).
6. **Parity** — Phase 01 jobs behavior is the acceptance target; no new features.

## Verify (stop gate)

- [ ] `../decisions.md` has Decision blocks for the policy contract, DAL kernel contract, and homes/tooling
- [ ] `open-questions.md` Resolved table has the genericization row
- [ ] `scope.md` notes the single-app (`apps/crm`) direction
- [ ] No code added or moved by this task
- [ ] `../STATUS.md` **Execute now** → `02-policy-generic.md`

## Out of scope

- Any package/app code change (tasks 02+).
- `customer_detail` work (Phase 02, after this phase).
