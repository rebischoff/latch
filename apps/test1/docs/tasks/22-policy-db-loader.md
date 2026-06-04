# 22 — Policy DB loader

> **Status:** Planning stub — not scheduled. Expand when task **21** is complete.

## Goal

Extend `@latch/policy` (or test1 adapter) to merge **DB grants** with Surface registry field ids at `PolicyService.resolve` time.

## Delivers

- Platform or app-level loader: YAML structure + DB grants → effective binding
- `data_master` wildcard unchanged for business Surfaces
- Unit tests: custom role grant → manifest diff
- Document platform PR boundary in [../decisions.md](../decisions.md)

## Reference

- [`packages/policy/src/`](../../../../packages/policy/src/)
- Phase 06 `policyVersion` + cache invalidation

## Prerequisites

- Task **21** complete.

## Note

This is the main **platform extension** driven by test1 — may land as PR to `packages/policy` rather than app-only hack.
