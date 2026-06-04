# 09 — Manifest cache benchmark

> **Status:** Complete (2026-06-03). Next: [`10-latch-app-role-t5.md`](./10-latch-app-role-t5.md).

## Goal

Provide a **repeatable check** that a cache hit avoids redundant `PolicyService` work (README DoD).

## Prerequisites

- [08-cache-correctness-t3.md](./08-cache-correctness-t3.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/policy/src/manifest-cache.test.ts` or `benchmark/` | Counter / timing test |
| [`../README.md`](../README.md) | Link to benchmark command in DoD notes (task **21** may finalize) |

## Steps

1. Instrument inner `resolve` with spy; assert **1 call** for two cached reads with same key.
2. Optional: simple `npm run test -- manifest-cache` micro-timing log (no flaky CI threshold — assert call count only).
3. Document expected hit rate in request-scoped CRM (narrative, not load test).

## Verify (stop gate)

- [x] Test fails if cache bypassed (regression guard)
- [x] `npm run test` green
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `10-latch-app-role-t5.md`

## Out of scope

Production APM. Load testing.
