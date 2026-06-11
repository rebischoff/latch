# 08 — Cache correctness and threat T3

> **Status:** Complete (2026-06-03). Next: [`09-benchmark-cache.md`](./09-benchmark-cache.md).

## Goal

Prove **revoked roles** and **`policyVersion` bumps** cannot produce successful writes from stale cached read manifests; extend threat **T3**.

## Prerequisites

- [07-global-options.md](./07-global-options.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | T3: cached manifest on read + revoke + write → 403 |
| `packages/policy/src/` | Tests for TTL invalidation on version bump |
| `apps/crm/src/lib/iam/` or test-utils | Helper to revoke role mid-scenario |

## Steps

1. Scenario: resolve manifest (populate cache) → bump `policyVersion` or revoke role → mutation → must 403.
2. Scenario: two reads same request still succeed (cache hit) before revoke.
3. Document in [`threat-model.md`](../../../foundations/threat-model.md) that T3 covers cache + recheck.

## Verify (stop gate)

- [x] `npm run test` — new T3 cases green (memory/no DB OK)
- [x] No mutation path uses cached manifest
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `09-benchmark-cache.md`

## Out of scope

Client `policyVersion` 409 (deferred). RLS tests.
