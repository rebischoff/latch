# 05c — Policy closeout (task 05 complete)

> **Status:** Complete (2026-06-10). Parent: [05-scope-and-delegation](./05-scope-and-delegation.md).

## Goal

Close policy task 05 verify gates and mark the **runtime roles task chain** complete in [`README.md`](./README.md).

## Deliverables

1. Parent task [05](./05-scope-and-delegation.md) — all verify `- [x]`; Status **Complete**.
2. Manifest cache regression with `scopeIds` present ([`manifest-cache.test.ts`](../../src/manifest-cache.test.ts)).
3. Confirm delegation remains app-owned (`validate-assignments.ts`); no move into `@latch/policy` required.
4. Update [`README.md`](./README.md): task 05 **complete**; "Do next" → none (or pointer to Phase 07 deferred).

## Verify (stop gate)

- [x] Policy task 05 verify checklist fully `[x]`
- [x] [`README.md`](./README.md) execution table shows 05 **complete** (2026-06-10)
- [x] No open policy tasks except deferred items in [00-decisions-needed](./00-decisions-needed.md) (P7 mode overlays, etc.)

## Deferred (not blocking "policy complete")

| Item | Where |
|------|-------|
| P7 mode overlays | [00-decisions-needed](./00-decisions-needed.md) |
| Additional `multiRoleCombine` modes | Phase 07 |
| Native Postgres RLS | Phase 07 |
| Explicit `effect: deny` authoring | Out of v1 |
