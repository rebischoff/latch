# Phase 05 — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Granularity (v1) | All-or-nothing per pending record |
| 2026-05-27 | Reviewer scope (v1) | Internal only; external sign-off deferred |
| 2026-05-27 | After reject | New pending on resubmit; trail links versions |

## Open / to lock

- [ ] Pending storage shape (`latch_pending_changes` columns) when moving off the in-memory store.
- [ ] Where `requires_verification` is declared in Surface YAML (Field-level vs Surface-level).
- [ ] Can a submitter edit a pending record before decision? Expiry / auto-reject for stale pending?
