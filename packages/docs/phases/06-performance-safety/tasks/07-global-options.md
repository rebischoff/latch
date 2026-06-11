# 07 — `manifestCacheMode` global option

> **Status:** Complete (2026-06-03). Next: [`08-cache-correctness-t3.md`](./08-cache-correctness-t3.md).

## Goal

Document and honor **`manifestCacheMode`** in [`global-options.md`](../../../foundations/global-options.md); CRM reads config (env or latch config seam).

## Prerequisites

- [06-request-cache-wiring.md](./06-request-cache-wiring.md) complete.

## Files

| File | Action |
|------|--------|
| [`../../../foundations/global-options.md`](../../../foundations/global-options.md) | Row for `manifestCacheMode` (if not done in 00) |
| `apps/crm/src/lib/latch.ts` | Read `LATCH_MANIFEST_CACHE_MODE` or documented default `request` |
| `packages/policy/` | Validate unknown mode throws clear error |

## Steps

1. Align docs with [00-decisions.md](./00-decisions.md) §4 defaults.
2. CRM: `none` for tests that assert resolve count unless explicitly testing cache.
3. Document in `apps/crm/docs/` or README snippet for operators.

## Verify (stop gate)

- [x] `global-options.md` lists option with v1 default `request`
- [x] CRM respects env override in dev
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `08-cache-correctness-t3.md`

## Out of scope

Per-tenant security tiers. Redis backend.
