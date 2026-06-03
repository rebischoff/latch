# 04 — Relocate jobs domain to `apps/crm`; remove from packages

## Goal

Move all consumer-owned jobs artifacts out of `packages/` into `apps/crm`, wire them onto the generic engines from `02`/`03`, and **delete the pilot code from the packages**. Repoint codegen, db-migrate, build, and tests. After this task the packages are domain-free; `apps/web` still exists (deleted in `05`).

## Prerequisites

- [`02-policy-generic.md`](./02-policy-generic.md) and [`03-dal-generic.md`](./03-dal-generic.md) complete (generic engines exist).

## Files

| File | Action |
|------|--------|
| `apps/crm/db/schema.ts` (new) | Move `jobs`, `assignments`, `latch_users` Drizzle tables from `packages/dal/src/schema.ts` |
| `apps/crm/db/seed.ts` (new) | Move `seedPilotJobs` + `SEED_*` constants |
| `apps/crm/db/store.ts` (new) | Jobs store: descriptor-keyed generic store from `@latch/dal`, or app impl per `03` decision |
| `apps/crm/modules/job/*` (moved) | Move `*.surface.yaml`, `*.policies.yaml`, `generated/*` from `apps/web/modules/job/` |
| `apps/crm/migrations/*` (moved) | Move `001_init.sql`, `002_*.sql` from `apps/web/migrations/` |
| `apps/crm/src/lib/latch.ts` | Build the `job` Surface descriptor + policy registry; call `createSurfaceDal` / inject registry into `PolicyService` |
| `packages/dal/src/{schema,seed,jobs/*}.ts` | **Delete**; remove shims/exports |
| `packages/policy/src/surfaces/job-*.ts` | **Delete**; remove shims/exports |
| `packages/codegen/src/generate.ts`, `run.ts` | Repoint `MODULES_ROOT` → `apps/crm/modules` |
| `scripts/db-migrate.mjs` | Repoint migration path + `.env.local` lookup → `apps/crm` |
| `package.json` (root) | `build` → `@latch/crm`; keep `codegen` / `db:migrate` working |
| `eslint.config.mjs` | Add rule: `packages/**` may not import `apps/**` |
| `tests/*.test.ts`, `packages/dal/src/jobs/repository.test.ts` | Retarget domain imports to `apps/crm` (or `apps/crm` test-utils export); kernel tests stay in `packages/` |

## Steps

1. Create `apps/crm/db` + `apps/crm/modules` + `apps/crm/migrations`; move files (preserve git history where possible).
2. Wire `apps/crm/src/lib/latch.ts` to assemble the `job` descriptor + registry and use the generic kernel/policy.
3. Repoint codegen `MODULES_ROOT`, `db-migrate.mjs`, root `build`.
4. Delete pilot code + shims from `@latch/dal` and `@latch/policy`; fix exports.
5. Move/repoint tests; add a small `apps/crm` test-utils export if `tests/*` need `seedPilotJobs` etc.
6. Add the ESLint `apps/*` import ban for `packages/**`.
7. Run `npm run codegen:check`, `npm run test`, `npm run build`.

## Verify (stop gate)

- [x] Grep: no `jobs` / `createJobsDal` / `seedPilotJobs` / `job_detail` / `job_list` identifiers remain under `packages/` (except fixture strings in generic tests)
- [x] No `packages/**` file imports `apps/**` (ESLint passes)
- [x] `@latch/codegen` reads from `apps/crm/modules`; `codegen:check` green
- [x] `npm run test` green (suite retargeted); `npm run build` (`@latch/crm`) green
- [x] `../STATUS.md` **Execute now** → `05-retire-web.md`

## Out of scope

- Deleting `apps/web` (task `05`).
- `customer_detail` schema/descriptor (Phase 02 task `04-db-schema`, now targeting `apps/crm`).
