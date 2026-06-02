# Phase 02b — decisions

## Decided

| Date | Topic | Choice |
|------|-------|--------|
| 2026-06-01 | Genericization timing | **Pull forward now**, before building `customer_detail`. Do not add a second domain to the packages. |
| 2026-06-01 | Package boundary | `@latch/*` carry **no** consumer table/Zod/Surface-metadata/UI. `packages/**` may not import `apps/**`. |
| 2026-06-01 | Sole consumer | **`apps/crm`** owns the jobs (and future customer) domain end to end and is the only proof harness. |
| 2026-06-01 | `apps/web` | **Retire / delete** once nothing references it (codegen root, migrations, build, env all repointed to `apps/crm`). |
| 2026-06-01 | Scope of the refactor | **Behavior parity only.** No new capabilities; the Phase 01 jobs behavior is the acceptance target. |
| 2026-06-01 | Separate publishable repo | **Still post-v1.** This phase genericizes *in place*; it does not extract `packages/*` to another repo. |

## Decision: generic policy contract (2026-06-01)

**Choice:** `@latch/policy` stops shipping hand-written surface modules. Instead:

- A consumer provides **policy data** (parsed from its own `*.policies.yaml` / `*.surface.yaml`) to `PolicyService`, e.g. a registry object keyed by `surfaceId` describing roles → surface actions, field grants, and row scope.
- `PolicyService.resolve(principal, scope)` keeps its current signature and merge semantics (`union_grants`, `denyWins`); only the **source** of surface definitions changes (injected, not imported).
- `packages/policy/src/surfaces/job-*.ts` are **removed**; their data moves to `apps/crm`.

**Rationale:** Permission semantics are platform; the *list of surfaces and their fields* is consumer data. Today they are conflated in `surfaces/*.ts`. The exact loader/registry shape is locked in [`tasks/02-policy-generic.md`](./tasks/02-policy-generic.md).

## Decision: generic DAL kernel contract (2026-06-01)

**Choice:** `@latch/dal` stops shipping `jobs/*` and `createJobsDal`. Instead it exposes:

- A **Surface descriptor** type (field id → column mapping, anchor table, writable/readable rules, row-scope predicate hooks) supplied by the consumer.
- A **Store adapter** interface (get / list / upsert / delete / row-scope checks) so the in-memory store and a future Postgres adapter are interchangeable; the concrete `MemoryJobStore` becomes an `apps/crm` implementation (or a generic memory store keyed by descriptor).
- A generic repository factory `createSurfaceDal(descriptor, store, deps)` providing `get` / `list` / `patch` / `bulkUpdate` / `bulkDelete` / `delete` with the **same** manifest projection, strict-write narrowing, forbidden-field omission, audit, and approval/pending behavior proven on jobs.

**Rationale:** Invariants 1–6 (manifest-driven projection, strict writes, forbidden-field omission, re-auth, audit) are platform concerns and stay in the kernel; the *shape of a row* is consumer data. App-specific quirks (e.g. `financial_terms` → pending) are expressed via descriptor hooks, not hardcoded. Exact descriptor + adapter shape is locked in [`tasks/03-dal-generic.md`](./tasks/03-dal-generic.md).

## Decision: consumer homes + tooling (2026-06-01)

**Choice:**

- **Metadata home:** `apps/crm/modules/` (was `apps/web/modules/`). `@latch/codegen` `MODULES_ROOT` repoints here.
- **Migrations home:** `apps/crm/migrations/` (was `apps/web/migrations/`). `scripts/db-migrate.mjs` + `.env.local` lookup repoint here.
- **Domain code home:** `apps/crm` owns the Drizzle schema, seed, store implementation, and the `createSurfaceDal` wiring for `job` (+ later `customer`).
- **Tests:** `tests/*` and package tests that import jobs domain from `@latch/dal` retarget to import from `apps/crm` (or an `apps/crm` test-utils export). The generic **kernel** keeps its own domain-free unit tests in `packages/`.
- **Build:** root `npm run build` targets `@latch/crm`.
- **Lint:** add `no-restricted-imports` (or equivalent) banning `apps/*` imports inside `packages/**`.

**Rationale:** Removes the bidirectional package↔`apps/web` coupling; makes the boundary ESLint-enforceable; aligns the repo with the documented end-state ahead of schedule.

## Open / to lock during tasks

- [ ] Exact policy registry/loader shape — lock in `02-policy-generic.md` (does codegen emit a policy registry, or does the app assemble it?).
- [ ] Exact Surface descriptor + Store adapter interfaces — lock in `03-dal-generic.md`.
- [ ] Whether the memory store stays generic in `@latch/dal` (descriptor-keyed) or moves wholesale to `apps/crm` — lock in `03`/`04`.
- [ ] Test-utils export surface from `apps/crm` for `tests/*` — lock in `04`.
