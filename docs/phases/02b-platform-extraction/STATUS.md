# STATUS — Phase 02b Platform extraction

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-01.

- **Home packages:** `@latch/policy`, `@latch/dal` (heavy); `@latch/contracts`, `@latch/codegen`, `apps/crm` (supporting).
- **State:** active (planning complete) — task chain seeded; no code yet. Goal: genericize `@latch/*`, make `apps/crm` the sole consumer, retire `apps/web`. **Parity refactor — no new features.**

## Right now — do this next

**Execute now → [`tasks/00-decisions.md`](./tasks/00-decisions.md)** — lock the generic boundary, the policy-loader + DAL-kernel contracts, the consumer homes (`apps/crm/modules`, `apps/crm/migrations`), test relocation, and the `apps/web` retirement. **Docs only.**

## Blockers

None. (Phase 02 `customer_detail` build is paused on this phase, not vice versa.)

## Recently completed

- Planning: phase folder + task chain `00–06` created; root + Phase 02 STATUS repointed (2026-06-01).
