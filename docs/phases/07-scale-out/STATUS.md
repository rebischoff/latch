# STATUS — Phase 07 Scale-out

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-03.

- **Home:** cross-cutting
- **State:** deferred (post internal-v1) — global pointer after Phase 06 close

## Right now — do this next

Not active and not scheduled. Pull items here into earlier phases (or split a new phase) only when a real driver appears (a second company, a second app, or an external consumer of `@latch/*`).

Phase 06 delivered manifest cache + T5/T12; RLS spikes, Postgres job store, and business-table audit triggers are scoped here — see [`README.md`](./README.md) and [`../06-performance-safety/decisions.md`](../06-performance-safety/decisions.md).

## Blockers

None — intentionally parked.

## Recently completed

- Per-request DB client seam exists (single `DATABASE_URL` hard-coded), so multi-company is a future config swap.
