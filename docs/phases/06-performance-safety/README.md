# Phase 06 — Performance & safety (`@latch/policy` / `@latch/dal`)

> **Home packages:** `@latch/policy`, `@latch/dal` · **Status:** not started · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

Two hardening capabilities that share a theme — do less work per request, and add a defense-in-depth net under the DAL:

1. **Configurable server-side manifest cache** so permissions need not be re-resolved on every read (security-tier configurable; writes always re-check).
2. **RLS as a coarse gate** (company / row / optional Surface-table access) — **not** per-Field. Field masking stays in the DAL + manifest.

## Depends on

- **Phase 00** — `PolicyService` (cache wraps resolution).
- **Phase 03** — `policyVersion` / role changes drive cache invalidation.

## In / out of scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| `manifestCacheMode`: `none` / `request` / `ttl` / `session` | Per-Field RLS / column GRANT explosion |
| Cache key `(principal, policyVersion, surfaceScope)` + invalidation | Distributed cache infra beyond a simple adapter |
| Writes always re-resolve (stale-manifest safety, T3) | Multi-company routing (Phase 07) |
| RLS spike: row/company + optional Surface-table gate | RLS-driven Field masking |
| Table-level audit triggers for direct-SQL bypass paths | — |

## Sub-goals — what this phase proves

1. Cached reads never bypass DAL narrowing — cache only skips re-running `PolicyService`.
2. A revoked role invalidates cached manifests; the next write still re-checks (T3).
3. RLS blocks cross-row/company access even if the DAL were bypassed (T5/T9 net).
4. Audit survives a non-DAL write path (trigger coverage).

## Definition of done

- [ ] `manifestCacheMode` honored with documented invalidation
- [ ] Benchmark: cache hit avoids policy re-resolution; correctness tests for revocation
- [ ] RLS spike findings recorded in [`../../discovery/postgres-rls-and-security.md`](../../discovery/postgres-rls-and-security.md)
- [ ] Decision on adopting RLS gate vs staying DAL-only

## References

- [`../../discovery/postgres-rls-and-security.md`](../../discovery/postgres-rls-and-security.md) · [`../../foundations/global-options.md`](../../foundations/global-options.md)
- [`../../reference/access-control.md`](../../reference/access-control.md) · [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T3, T5, T9, T12)
