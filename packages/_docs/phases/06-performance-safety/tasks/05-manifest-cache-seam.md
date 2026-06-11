# 05 — Manifest cache seam (`@latch/policy`)

> **Status:** Complete (2026-06-03). Next: [`06-request-cache-wiring.md`](./06-request-cache-wiring.md).

## Goal

Implement a **cache wrapper** around `PolicyService.resolve` supporting modes **`none`**, **`request`**, and **`ttl`** per [00-decisions.md](./00-decisions.md) §1–§2.

## Prerequisites

- [04-policy-version.md](./04-policy-version.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/policy/src/` | `manifest-cache.ts` (or equivalent); export from package index |
| `packages/policy/src/policy-service.test.ts` | Cache hit/miss; key includes `policyVersion` |

## Steps

1. Define `ManifestCacheConfig`: `{ mode, ttlMs? }` and `ManifestCacheStore` interface.
2. Implement in-memory store for `ttl`; `request` store passed from caller (Map per request).
3. Cache key: `(principalId, policyVersion, surfaceId, mode, entityId?)` — include `PolicyScope.mode` (`list`/`detail`/`create`); they resolve differently on the same surface.
4. `mode: none` delegates directly to inner `PolicyService`.
5. On `policyVersion` mismatch, treat as miss.
6. Export `createCachingPolicyService(policy, config, store?)` or wrap class.

## Verify (stop gate)

- [x] Package unit tests: second resolve with same key returns same object / does not call merge twice (spy)
- [x] Version change → miss
- [x] `npm run test` — `@latch/policy` green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `06-request-cache-wiring.md`

## Out of scope

CRM wiring (task **06**). `session` mode (throws or documents defer).
