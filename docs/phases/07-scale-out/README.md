# Phase 07 — Scale-out (cross-cutting)

> **Home:** cross-cutting · **Status:** deferred (post internal-v1) · **Phase STATUS:** [`STATUS.md`](./STATUS.md)

## Goal

Everything that only matters once Latch serves more than one internal app/company: **multi-company DB routing**, **package publishing**, and the larger post-v1 expansions held in the deferred list.

## Depends on

- All earlier phases (this is the "harden + distribute" phase).

## In / out of scope

| In scope (eventually) | Explicitly later / maybe never |
|-----------------------|--------------------------------|
| Company → `DATABASE_URL` routing; per-request client by company | Shared-schema multi-tenancy (`tenant_id`) — rejected by design |
| Neon branch/provisioning per company | — |
| Publish `@latch/*` packages | — |
| Additional role-merge modes (`intersection_grants`, `most_restrictive`, `priority`) | — |
| Partial / per-Field verification; external reviewers | — |
| OpenAPI generation; async bulk for >cap batches | tRPC / GraphQL (no current driver) |

## Sub-goals

1. The single-company hard-coding becomes a config swap, not a refactor (the per-request client seam already exists).
2. `@latch/*` packages are publishable with stable `exports` and no server leakage into client bundles.

## Definition of done

- [ ] Company routing behind a provider; cross-company isolation tested (T9)
- [ ] Packages publish cleanly; client imports remain `contracts`/`react` only
- [ ] Deferred items promoted here have their own task chains when scheduled

## References

- [`../../foundations/scope.md`](../../foundations/scope.md) (deferred list) · [`../../reference/packages.md`](../../reference/packages.md)
- [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T9 cross-company leak)
