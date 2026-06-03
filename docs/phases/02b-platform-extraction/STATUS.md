# STATUS — Phase 02b Platform extraction

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-02.

- **Home packages:** `@latch/policy`, `@latch/dal` (heavy); `@latch/contracts`, `@latch/codegen`, `apps/crm` (supporting).
- **State:** **complete** — `@latch/*` domain-agnostic; `apps/crm` sole consumer; `apps/web` retired. Parity verified (2026-06-02).

## Right now — do this next

**Phase complete.** Global active phase → [Phase 02 UI sync](../02-ui-sync/STATUS.md). Next work continues there → [`../02-ui-sync/tasks/06-surface-yaml.md`](../02-ui-sync/tasks/06-surface-yaml.md) (Phase 02 task **04** db schema already merged).

## Blockers

None.

## Recently completed

- **Task 06** — `npm run test` / `build` / `codegen:check` green; boundary grep + ESLint clean; two-role jobs parity via e2e + `repository.test.ts` + threat T2/T15; root STATUS repointed to Phase 02 (2026-06-02).
- **Task 05** — `apps/web` deleted; root tooling repointed to `@latch/crm` (`package.json`, `tsconfig.json`, `eslint.config.mjs`, `launch.json`); doc sweep across `packages.md`, `architecture-overview.md`, `crm-and-phases.md`, `DATABASE.md`, `scope.md`, READMEs, `development.md`. `babel-plugin-react-compiler` moved to `apps/crm` (was only in `apps/web`). build/test/codegen:check green (2026-06-02).
- **Task 04** — jobs domain relocated to `apps/crm` (`db/`, `modules/job/`, migrations, policy registry, `createJobsDal` wiring); packages domain-free; codegen/db-migrate/build/tests repointed (2026-06-02).
- **Task 03** — generic `createSurfaceDal` kernel + `SurfaceDescriptor` / `StoreAdapter`; fixture-descriptor kernel tests (2026-06-02).
- **Task 02** — metadata-driven `@latch/policy` registry; `PolicyService` resolves from injected registry; job shim in `compat/default-registry.ts` (2026-06-02).
- **Task 00** — boundary + policy/DAL kernel contracts + consumer homes locked in `decisions.md`, `open-questions.md`, `scope.md` (2026-06-02).
- Planning: phase folder + task chain `00–06` created; root + Phase 02 STATUS repointed (2026-06-01).
