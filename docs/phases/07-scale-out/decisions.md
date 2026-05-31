# Phase 07 — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-27 | Tenancy | Database-per-company; no shared-schema `tenant_id` |
| 2026-05-27 | v1 routing | Single company, hard-coded `DATABASE_URL` (abstraction present) |

## Open / to lock (when scheduled)

- [ ] Company → `DATABASE_URL` routing provider + provisioning (Neon branch vs project per company).
- [ ] Package publishing process for `@latch/*`.
- [ ] Which deferred items (extra merge modes, partial verification, OpenAPI, async bulk) get promoted, and to which phase.
