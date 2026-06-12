# Phase 09 — Decisions

> Phase-scoped decisions. The extraction-slice decisions (9.1–9.8) are **locked in the discussion track** and linked here; this file holds Phase-09-specific execution decisions and the open items to lock before the tasks they gate.

## Inherited (locked in the opinionation track)

| # | Slice | Source |
|---|-------|--------|
| 9.1 | `@latch/adapter-pg-audit` first | [`10-opinionation-roadmap.md` slice 1](../../discussions/10-opinionation-roadmap.md#extraction-sequence) |
| 9.2 | `@latch/pg-session` extract + re-export | slice 2 |
| 9.3 | `@latch/adapter-neon` (standard pg, dual URL) | slice 3 |
| 9.4 | `latch_app_config.audit_mode` + DAL gate + `--audit-mode` | slice 4 |
| 9.5 | `@latch/adapter-better-auth` + template | slice 5 |
| 9.6 | `@latch/app-kit` full bootstrap + REST/Actions | slice 6 |
| 9.7 | ~~`@latch/adapter-drizzle`~~ → **`@latch/adapter-pg-store`** (SQL-first, 2026-06-11) | slice 7 (re-scoped) |
| 9.8 | Merge server kernel (optional, after slice 7) | slice 8 |

scope.md reconciliations (2026-06-11): platform packaging in-v1, fresh-start consumer, audit modes, Neon adapter, pg-session trigger — [`../../foundations/scope.md`](../../foundations/scope.md).

## Decision: clean slate before extraction (2026-06-11)

**Choice:** Phase 09 **task 00** removes all `apps/` (`crm`, `widgets`, `spike_policy`, `spike_business`, `spike_codegen`). Root tooling (`package.json` workspaces, `tsconfig`, `eslint`, `scripts/db-migrate.mjs` targets, codegen scan root) is repointed to operate on the **template** and a to-be-scaffolded app. The trades-CRM domain (job/customer Surface YAML, migrations, seed) is **preserved as fixtures** to rebuild the proof app, not kept as a live app.

**Rationale:** Owner chose a fresh baseline. Extracting against drifted apps would force per-app migration in every slice; a scaffold-from-template proof is the real "zero glue" acceptance test.

## Decision: CRM proof fixtures home (2026-06-11)

**Choice:** Trades-CRM domain YAML, business migrations, and seed live under **`fixtures/crm-proof/`** — consumed by task 10 scaffold proof, not shipped in the default template.

**Rationale:** Keeps the template generic; the proof app copies domain fixtures in at scaffold time.

## Decision: SQL-first persistence — re-scope slice 9.7 (2026-06-11)

**Choice:** Drizzle is **retired as the runtime ORM**. Slice **9.7** changes from `@latch/adapter-drizzle` to **`@latch/adapter-pg-store`**: an **async `StoreAdapter`** over raw `pg`, plus `codegen`-emitted single-table store SQL (`store.generated.ts`). `StoreAdapter` is promoted from **sync → async** as a prerequisite (kernel + `bulk.ts` + `delete-row.ts` + tests). Memory stores become **kernel-unit-test doubles only**; generated + hand-written SQL gets a **Postgres integration test tier**. `codegen --check` cross-checks YAML types against **parsed migration DDL** (not Drizzle). No change to slices 9.1 (`adapter-pg-audit`) or 9.2 (`pg-session`) — already raw `pg`. Canonical: [`../../discussions/11-spine-adapters-skin.md`](../../discussions/11-spine-adapters-skin.md#decision-sql-first-persistence--retire-drizzle-as-the-runtime-orm-2026-06-11); v1 scope: [`../../foundations/scope.md`](../../foundations/scope.md#decision-sql-first-persistence--retire-drizzle-as-runtime-orm-2026-06-11).

**Rationale:** An ORM adds a second schema-of-record competing with YAML + migrations — the drift Latch removes; the AI-authoring north star emits YAML + SQL DDL, not ORM models; Postgres is a welded spine bet so ORM dialect-portability is moot; and an ORM-free kernel keeps the fast DB-free compartment tests.

## Decision: `DatabaseConnections` type home (2026-06-11)

**Choice:** `DatabaseConnections` (`{ pool, directPool }`) lives in **`@latch/pg-session`**. `@latch/adapter-neon` implements `createDatabaseConnections()` and returns that type.

**Rationale:** Connection pools are server-only and pair naturally with `withPermissionDb`; `@latch/contracts` stays browser-safe.

## Decision: `latch_app_config` shape (2026-06-11)

**Choice:** **Single-row typed table** — `latch_app_config` with `id SMALLINT PRIMARY KEY CHECK (id = 1)` and `audit_mode TEXT NOT NULL` (`full` \| `standard` \| `recovery`). Seeded at scaffold via `latch new --audit-mode=…` (default `full`). `latch_app` receives `SELECT` only; runtime immutability is enforced in application code (no UPDATE grant).

**Rationale:** One canonical row avoids key/value ambiguity for platform knobs that will accumulate (`audit_mode` first). Typed column + CHECK constraint gives Postgres validation; upgrade-only changes are operator migrations against this row.

## Open — lock before the gated task
- **Server kernel package name** (gates slice 8, optional): `@latch/core` vs `@latch/server`. Defer until slice 7 done.

## Related

- [`README.md`](./README.md) · [`tasks/01-task-index.md`](./tasks/01-task-index.md) · [`STATUS.md`](./STATUS.md)
- [`../../discussions/10-opinionation-roadmap.md`](../../discussions/10-opinionation-roadmap.md)
