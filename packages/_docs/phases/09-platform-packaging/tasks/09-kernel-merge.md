# 09 — Merge server kernel (optional)

> **Status:** Not started (optional). Next: [10-scaffold-proof.md](./10-scaffold-proof.md).

## Goal

Optional ergonomics: merge `@latch/policy` + `@latch/dal` + `@latch/audit` + `@latch/approval` into one server package. (Slice 9.8.) **Behavior parity only** — compartment + threat tests unchanged. Keep `@latch/contracts` and `@latch/react` separate; adapters stay out.

## Prerequisites

- Task 08 complete (adapters proven end-to-end).
- [`../decisions.md`](../decisions.md) server-kernel package name locked (`@latch/core` vs `@latch/server`).

## Files

| File | Action |
|------|--------|
| `packages/<core>/` | Merge the four server packages as internal modules; server-only export map |
| ESLint boundary rules | Replace cross-package cycle rules with internal module boundaries |
| consumers / template | Import the single server package |

## Verify (stop gate)

- [ ] Compartment + threat tests pass **unchanged** before/after merge.
- [ ] `contracts` / `react` / adapters untouched.
- [ ] Strict internal module boundaries enforced (no re-introduced cycles).
- [ ] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `10-scaffold-proof.md`.

## Decision gate

If the merge churn outweighs the ergonomics win at this point, **skip** and record the skip in [`../decisions.md`](../decisions.md); the physical split is acceptable for v1.

## Out of scope

- Publishing; runtime semantics changes.
