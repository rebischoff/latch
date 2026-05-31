# Phase 06 — decisions

## Open / to lock (carried from planning chat 2026-05-29)

- [ ] **Manifest cache modes.** `none` / `request` / `ttl` / `session`, configurable per security tier. Default likely `request`. Writes always re-resolve regardless of cache.
- [ ] **Cache invalidation.** Bump `policyVersion` on role/policy change; decide storage (in-memory vs Redis later).
- [ ] **RLS posture.** RLS as a coarse **Surface/row/company gate**, not per-Field. Confirm after the spike whether to adopt in v1+ or stay DAL-only.

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | RLS (v1) | Deferred; v1 enforcement DAL-only |
| 2026-05-27 | Stale manifest on write | `recheck` — re-resolve on every mutation |
