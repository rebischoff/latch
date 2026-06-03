# Phase 02b — Platform extraction (genericize `@latch/*`)

> **Inserted change order (2026-06-01).** Sits between Phase 02 decisions ([`../02-ui-sync/tasks/00-decisions.md`](../02-ui-sync/tasks/00-decisions.md)) and the `customer_detail` build. Global pointer: [`../../../STATUS.md`](../../../STATUS.md) · Phase STATUS: [`STATUS.md`](./STATUS.md) · Tasks: [`tasks/01-task-index.md`](./tasks/01-task-index.md)

## Goal

Make the `@latch/*` packages **domain-agnostic**. After this phase, no package under `packages/` contains a consumer's table definitions, Zod shapes, Surface metadata, or UI. `apps/crm` becomes the **sole consumer and proof harness**, owning the jobs (and future customer) domain end to end. `apps/web` is retired.

## Why now

The `job_detail` / `job_list` pilot baked the jobs domain **directly into the packages**, not into a consumer app:

- `@latch/dal` ships `schema.ts` (`jobs`, `assignments`, `latch_users`), `seed.ts`, `jobs/memory-store.ts`, and a bespoke `createJobsDal`.
- `@latch/policy` ships hand-written `surfaces/job-detail.ts` / `surfaces/job-list.ts` (no metadata loader exists).
- `@latch/codegen` reads metadata from a hardcoded `apps/web/modules` path; `scripts/db-migrate.mjs` and the root `build` script also target `apps/web`.

Building `customer_detail` on this pattern would **deepen** the coupling (a second domain baked into the packages). It is cheaper to genericize **before** adding the second Surface than after.

## Depends on

- **Phase 01 complete** — jobs list/projection/bulk proven; this is the behavior **parity target** for the generic kernel.
- **Phase 02 task 00** decisions locked (`customer_detail` sketch unaffected; it just lands in `apps/crm` afterward).

## In scope

| In | Out (this phase) |
|----|------------------|
| Generic, metadata-driven `@latch/policy` loader | `customer_detail` feature work (resumes in Phase 02) |
| Generic, metadata-driven `@latch/dal` kernel + store-adapter interface | New capabilities, RLS, multi-company |
| Relocate jobs schema / seed / store / Surface YAML / migrations → `apps/crm` | Publishing `@latch/*` to a **separate repo** (still post-v1) |
| Retarget `tests/*` + package tests to import domain from `apps/crm` | Re-architecting policy/audit semantics (behavior parity only) |
| Repoint codegen / db-migrate / build; add ESLint `apps/*` import ban to packages | |
| Delete `apps/web`; doc sweep | |

## Definition of done (parity, not new features)

- [x] `packages/**` contains **zero** jobs/customers identifiers (grep clean: no `jobs`, `createJobsDal`, `seedPilotJobs`, `job_detail`, `job_list` in `packages/`).
- [x] No `packages/**` file references `apps/**` (ESLint-enforced).
- [x] `@latch/codegen` reads consumer metadata from `apps/crm` (no `apps/web` path).
- [x] `npm run test`, `npm run build`, `npm run codegen:check` all green.
- [x] Jobs proof still works in `apps/crm` clicked through as both seed roles (tech vs admin row scope + `financial_terms` omission unchanged).
- [x] `apps/web` deleted; `packages.md`, `architecture-overview.md`, `crm-and-phases.md`, `apps/crm/docs/DATABASE.md`, `scope.md` updated.

## Heaviest changes (answer to "is policy/dal heavily rewritten?")

**Yes.** See [`tasks/02-policy-generic.md`](./tasks/02-policy-generic.md) and [`tasks/03-dal-generic.md`](./tasks/03-dal-generic.md).

- **`@latch/policy`** — add a metadata→policy loader; delete the hardcoded `surfaces/*` registry. New runtime, not a move.
- **`@latch/dal`** — replace `createJobsDal` with a generic projection / narrow / patch / bulk / get / list / delete kernel driven by an app-supplied Surface descriptor (field→column maps) and a `Store` adapter interface. The jobs-specific wiring moves to `apps/crm`.

`contracts`, `react`, `audit`, `approval`, `codegen` mostly need re-pointing and small additions (shared metadata types, codegen root), not redesign.

## References

- [`decisions.md`](./decisions.md) — locked boundary + engine contracts
- [`../../reference/packages.md`](../../reference/packages.md) — package boundary table (updated by task 05)
- [`../../reference/metadata-and-codegen.md`](../../reference/metadata-and-codegen.md) — YAML→TS pipeline
- [`../02-ui-sync/README.md`](../02-ui-sync/README.md) — resumes after this phase
