# STATUS — Phase 06 Performance & safety

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-05-29.

- **Home packages:** `@latch/policy`, `@latch/dal`
- **State:** not started

## Right now — do this next

Not active. Entry point when picked up: design the `manifestCacheMode` seam + invalidation, then run the RLS spike (Spikes A–D) and record findings.

## Blockers

- Cache invalidation is cleaner once Phase 03 provides `policyVersion` / DB-backed roles.

## Recently completed

- Nothing yet. RLS is currently deferred; enforcement is DAL-only.
