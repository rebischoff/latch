# Phase 06 — Performance & safety (`@latch/policy` / `@latch/dal`)

> **Home packages:** `@latch/policy`, `@latch/dal` · **Status:** complete (2026-06-03) · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

Do less work per request, and land the cheap, v1-required connection-safety controls:

1. **Configurable server-side manifest cache** so permissions need not be re-resolved on every read (security-tier configurable; writes always re-check).
2. **Connection safety**: confirm the app runs as the non-superuser `latch_app` (**T5**, a v1 CI minimum) and bind the acting principal via `SET LOCAL` on the Postgres paths that exist (**T12**).

> **RLS is deferred to Phase 07** (decision 2026-06-03). The pilot reads `jobs` from an in-memory store, so RLS would protect data the app never `SELECT`s; it becomes meaningful alongside the Postgres job store and multi-company work. This re-honors the locked v1 "DAL-only; RLS deferred" scope. See [`tasks/00-decisions.md`](./tasks/00-decisions.md) §6.

## Depends on

- **Phase 00** — `PolicyService` (cache wraps resolution).
- **Phase 03** — `policyVersion` / role changes drive cache invalidation.

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| `manifestCacheMode`: `none` / `request` / `ttl` (`session` seam-only) | Per-Field RLS / column GRANT explosion |
| Cache key `(principal, policyVersion, surfaceId, mode, entityId?)` + invalidation | Distributed cache infra beyond a simple adapter |
| Writes always re-resolve (stale-manifest safety, T3) | **All RLS** (spikes + adoption) → Phase 07 |
| `latch_app` non-superuser connection (T5) | Business-table audit triggers → Phase 07 |
| `SET LOCAL` actor binding on audit/pending/IAM (T12) | Multi-company routing / T9 (Phase 07) |

## Sub-goals — what this phase proves

1. Cached reads never bypass DAL narrowing — cache only skips re-running `PolicyService`.
2. A revoked role / `policyVersion` bump invalidates cached manifests; the next write still re-checks (T3).
3. The app connects as a non-superuser role (T5) and attributes the correct actor under pooled connections (T12).

## Definition of done

- [x] `manifestCacheMode` honored with documented invalidation
- [x] Benchmark: cache hit avoids policy re-resolution; correctness tests for revocation (T3) — **`npm run test -- -t "Phase 06"`** (spy/call-count; see [`apps/crm/docs/CONFIG.md`](../../../../apps/crm/docs/CONFIG.md) § expected hit rate)
- [x] T5 (`latch_app` non-superuser) in CI; T12 actor-binding control landed on PG paths
- [x] RLS deferral recorded as a dated decision; discovery doc + Phase 07 README updated

## Task chain

Execute in order — see [`tasks/01-task-index.md`](./tasks/01-task-index.md). Start with [`tasks/00-decisions.md`](./tasks/00-decisions.md) (planning gate).

## References

- [`../../discovery/postgres-rls-and-security.md`](../../discovery/postgres-rls-and-security.md) (RLS spike — now targeted at Phase 07) · [`../../foundations/global-options.md`](../../foundations/global-options.md)
- [`../../reference/access-control.md`](../../../policy/docs/access-control.md) · [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T3, T5, T12; T9 → Phase 07)
