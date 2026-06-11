# 06 — Request-scoped cache wiring (CRM)

> **Status:** Complete (2026-06-03). Next: [`07-global-options.md`](./07-global-options.md).

## Goal

Wire **`manifestCacheMode: request`** in `apps/crm` so list/detail/nav paths reuse manifests within one server request; **all mutations bypass** the read cache.

## Prerequisites

- [05-manifest-cache-seam.md](./05-manifest-cache-seam.md) complete.

## Files

| File | Action |
|------|--------|
| [`apps/crm/src/lib/latch.ts`](../../../../../apps/crm/src/lib/latch.ts) | The seam: module-level `policyService` + `resolveContext` (lines ~30, ~137). Wrap with cache here. |
| `apps/crm/src/lib/jobs/` / `customers/` | No change expected — they already receive `PermissionContext` from `resolveContext` |
| Server actions / route handlers | Reuse `resolveContext`; no new context plumbing |

## Steps

1. **Preferred mechanism:** memoize per request with React `cache()` (Next.js 16 idiomatic per-request dedupe) wrapping the resolve inside `resolveContext`, **or** an explicit per-request `Map`. Confirm against `node_modules/next/dist/docs/` before choosing (AGENTS.md rule).
2. Replace the bare `policyService.resolve` calls in `resolveContext` with the caching wrapper from task **05**, defaulting to `request` per config (task **07**).
3. **Mutation paths bypass cache.** `resolveContext` today is used for both reads and the context passed to mutations — ensure `patch` / `delete` / `acceptPending` / `bulkUpdate` obtain a **fresh** manifest (uncached `resolve`), since `stalePolicyOnWrite: recheck` is load-bearing (T3). Add a `resolveContextFresh` or a `{ cache: false }` flag.
4. Tests: two `resolveContext` calls for the same `(surface, mode, entityId)` in one simulated request resolve once (spy on `policyService.resolve`).

## Verify (stop gate)

- [x] CRM tests pass with cache enabled
- [x] Mutation paths documented/code-reviewed for bypass
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `07-global-options.md`

## Out of scope

`ttl` mode in production CRM (optional dev-only flag). Benchmark (task **09**).
