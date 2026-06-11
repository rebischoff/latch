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
| **Postgres-backed job store** (replaces `MemoryJobStore`) — prerequisite for RLS | Per-Field RLS / column GRANT explosion — rejected (DAL owns Field masking) |
| **RLS spikes (A/C/D) + pilot adoption** (coarse row/company gate) — deferred from Phase 06 (2026-06-03) | — |
| **Business-table audit triggers** (direct-SQL bypass net) — deferred from Phase 06 | — |
| Publish `@latch/*` packages; `latch` CLI runnable from an external app root (cwd/config scan root) | — |
| One-time project scaffolder (`create-latch-app` / `latch new`) | Codegen *owning/overwriting* app pages (sync ≠ scaffold) |
| Additional role-merge modes (`intersection_grants`, `most_restrictive`, `priority`) | — |
| Partial / per-Field verification; external reviewers | — |
| OpenAPI generation; async bulk for >cap batches | tRPC / GraphQL (no current driver) |

## Sub-goals

1. The single-company hard-coding becomes a config swap, not a refactor (the per-request client seam already exists).
2. `@latch/*` packages are publishable with stable `exports` and no server leakage into client bundles.
3. A Postgres-backed job store lands, enabling RLS as a real defense-in-depth net (the `SET LOCAL` actor binding from Phase 06 is reused).
4. **Latch is consumable as an installable SDK + CLI from a business app in its own repo** — not just from in-repo `apps/*`. Target model and the sync/scaffold split are locked in [`../../discussions/01-codegen.md`](../../discussions/01-codegen.md#decision-latch-is-an-installable-sdk--cli-monorepo-apps-are-dev-only-2026-06-06). Includes: drop `private`/build to `dist`, and fix codegen's `import.meta.url`-anchored scan root to resolve from the **invocation root (`process.cwd()` / config)**. Driver (2026-06-06): new business apps developed outside this monorepo once Latch is proven.

## RLS (carried from Phase 06, deferred 2026-06-03)

RLS work was deferred out of Phase 06 because the pilot job data is in-memory, so RLS would protect tables the app never reads. When the Postgres job store lands here, run the spikes and adopt selectively:

- **Spike A** — company/row RLS on `jobs` / `assignments` (`SET LOCAL app.principal_id`, assignment-join ownership).
- **Spike C** — `SECURITY DEFINER` audit-trigger hardening (direct-SQL bypass → audit row).
- **Spike D** — RLS on `latch_pending_changes` (submitter vs reviewer visibility).
- **Spike B** — Field-mask views: confirmed **defer permanently** (role-cardinality explosion; DAL owns Field masking).

Findings + design target: [`../../discovery/postgres-rls-and-security.md`](../../discovery/postgres-rls-and-security.md). Decision context: [`../06-performance-safety/decisions.md`](../06-performance-safety/decisions.md).

## Definition of done

- [ ] Company routing behind a provider; cross-company isolation tested (T9)
- [ ] Postgres job store replaces `MemoryJobStore`; RLS spikes run and adopt/defer recorded
- [ ] Packages publish cleanly; client imports remain `contracts`/`react` only
- [ ] A business app in a **separate repo** can install `@latch/*` + run `latch codegen` from its own root (codegen scan root resolves from cwd/config, not `import.meta.url`)
- [ ] Deferred items promoted here have their own task chains when scheduled

## References

- [`../../foundations/scope.md`](../../foundations/scope.md) (deferred list) · [`../../reference/packages.md`](../../reference/packages.md)
- [`../../foundations/threat-model.md`](../../foundations/threat-model.md) (T9 cross-company leak)
