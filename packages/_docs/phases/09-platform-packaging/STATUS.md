# STATUS — Phase 09 Platform packaging

> Phase-local quarterback. Global pointer: [`../../../../STATUS.md`](../../../../STATUS.md).
> Updated: 2026-06-11.

- **Home packages:** new `@latch/adapter-pg-audit`, `@latch/pg-session`, `@latch/adapter-neon`, `@latch/adapter-better-auth`, `@latch/app-kit`, **`@latch/adapter-pg-store`** (was `@latch/adapter-drizzle` — SQL-first, 2026-06-11); touches `@latch/audit`, `@latch/dal` (async `StoreAdapter`), `@latch/codegen` (template + store SQL).
- **Persistence decision (2026-06-11):** SQL-first — Drizzle retired as runtime ORM; raw `pg` + codegen-emitted single-table SQL; `StoreAdapter` goes async. See [`decisions.md`](./decisions.md#decision-sql-first-persistence--re-scope-slice-97-2026-06-11).
- **State:** **complete** (2026-06-11). Task 10 scaffold proof closed the phase.

## Right now — do this next

Phase 09 is **complete**. No further tasks in this phase unless optional [09-kernel-merge](./tasks/09-kernel-merge.md) or parallel [11-ai-toolchain](./tasks/11-ai-toolchain.md) are pulled. Global pointer: [`../../../../STATUS.md`](../../../../STATUS.md).

## Open decisions (lock before the gated task)

- Server-kernel package name → gates optional task 09.

## Blockers

None.

## Recently completed

- **10-scaffold-proof** (2026-06-11) — `latch new crm_proof` at repo root; trades-CRM domain from `fixtures/crm-proof/`; `@latch/*` only (thin `lib/latch.ts` + jobs DAL); REST `GET /api/jobs`; two-role parity tests in `crm_proof/lib/jobs/`; `npm run test` / `build` / `codegen:check` green.
- **08-adapter-pg-store** (2026-06-11) — `StoreAdapter` promoted to async; `@latch/adapter-pg-store` exports `createPgStoreAdapter` + `columnBindingsFromMap` over `pg` + `withPermissionDb`; codegen emits `store.generated.ts` + migration DDL cross-check; widget fixture migration + generated store; PG integration tests (`it.runIf`); `npm run test` / `build` / `codegen:check` green.
- **07-app-kit** (2026-06-11) — `@latch/app-kit` exports `createResolveContext`, `createEnsureAuditBootstrap`, `createSurfaceRouteHandlers` / `createSurfaceListRouteHandlers`, optional `createSurfaceActions`, manifest request cache + API error helpers; template `lib/latch.ts` + `lib/db.ts` wired via `@latch/adapter-neon`; deleted `audit-bootstrap.ts`; unit tests for `resolveContext` shape and REST GET read path; `npm run test` / `build` green.
- **06-adapter-better-auth** (2026-06-11) — `@latch/adapter-better-auth` exports `createBetterAuth`, `createGetPrincipal`, `loadPrincipalFromDb`, `resolveLatchUserId`, `readBetterAuthSession`; template `lib/latch.ts` + `api/auth/[...all]` wired; `login_email` bridge on `latch_users`; unit tests for subject/email mapping and DB-backed bindings; `npm run test` / `build` green.
- **05-audit-mode** (2026-06-11) — `011_latch_pending_changes` + `012_latch_app_config` template migrations; `writeAudit` mode gate (`full`/`standard`/`recovery`); `latch new --audit-mode` scaffold flag; `ensureAuditMode()` bootstrap; unit tests + audit-and-lifecycle docs.
- **04-adapter-neon** (2026-06-11) — `@latch/adapter-neon` exports `createDatabaseConnections()` / `resolveDatabaseEnv()` (standard `pg`, dual URL, `latch_app` runtime rewrite); `DatabaseConnections` type in `@latch/pg-session`; template `.env.example` documents pooled/direct URLs + `LATCH_APP_ROLE_PASSWORD`; unit tests cover env parsing and pool selection; `npm run test` / `build` green.
- **03-pg-session** (2026-06-11) — `@latch/pg-session` exports `withPermissionDb` / `bindPermissionSession` / `LATCH_DEFAULT_COMPANY_ID`; `@latch/audit` re-exports with deprecation note; `adapter-pg-audit`, `approval`, and `dal` import `@latch/pg-session`; unit tests moved to `packages/pg-session`; `npm run test` / `build` green.
- **02-adapter-pg-audit** (2026-06-11) — `@latch/adapter-pg-audit` exports `createPostgresAuditWriter`; template imports package; per-app `audit-db-writer.ts` copies gone; unit tests cover INSERT shape + `withPermissionDb` actor binding; `npm run test` / `build` green.
- **00-clean-slate** (2026-06-11) — removed all `apps/`; workspaces = `packages/*` only; CRM domain preserved in `fixtures/crm-proof/`; codegen scan cwd-anchored (`LATCH_CODEGEN_ROOTS`); `db-migrate.mjs` defaults to template; `npm install` / `npm run build` / `npm test` / `npm run codegen:check` green.
- Planning: scope.md reconciled (platform packaging in-v1, fresh-start consumer, audit modes, Neon adapter, pg-session trigger); Phase 09 folder + README + decisions + task chain `00–11` created (2026-06-11).
