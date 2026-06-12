# Phase 09 — Platform packaging (extract reference adapters)

> **Inserted change order (2026-06-11).** Graduates the opinionation track ([`../../discussions/10-opinionation-roadmap.md`](../../discussions/10-opinionation-roadmap.md), sessions 1–9) into executable work. Global pointer: [`../../../../STATUS.md`](../../../../STATUS.md) · Phase STATUS: [`STATUS.md`](./STATUS.md) · Tasks: [`tasks/01-task-index.md`](./tasks/01-task-index.md)

## Goal

Ship the **reference adapters** as real `@latch/*` packages so a freshly scaffolded app imports the platform instead of copy-pasting it. After this phase, `packages/codegen/template/` contains **zero copied adapter glue** (no per-app `audit-db-writer.ts`, no bespoke bootstrap), and `latch new <slug>` produces an app that builds, migrates, and passes a trades-CRM proof using only `@latch/*` imports.

This is the in-monorepo `workspace:*` continuation of [Phase 02b](../02b-platform-extraction/README.md). **Publishing `@latch/*` to npm stays deferred to [Phase 07](../07-scale-out/README.md).**

## Why now

The pilot baked reference adapters into apps as copy-paste:

- `createPostgresAuditWriter` is duplicated in three `lib/audit-db-writer.ts` files.
- `withPermissionDb` lives inside `@latch/audit` (spine leakage — session binding is shared infrastructure).
- Bootstrap (`resolveContext`, manifest cache, `ensureAuditWriter`, REST/Action factories) and DB connection wiring are re-hand-rolled per app.
- Audit modes, `latch_app_config`, and `011_latch_pending_changes` are decided but unbuilt.

Owner locked (2026-06-11) the packaging churn as in-v1 hardening and a **fresh start**: all current apps are disposable; the template + a scaffolded app are the only consumers.

## Depends on

- **Opinionation track sessions 1–9 complete** — decisions in [`../../discussions/10-opinionation-roadmap.md`](../../discussions/10-opinionation-roadmap.md) (extraction slices 9.1–9.8), [`12-audit-opinionation.md`](../../discussions/12-audit-opinionation.md), [`07-template-scaffold.md`](../../discussions/07-template-scaffold.md), [`08-ai-authored-surfaces.md`](../../discussions/08-ai-authored-surfaces.md).
- **scope.md reconciliations (2026-06-11)** — platform packaging in-v1, fresh-start consumer, audit modes, Neon adapter, pg-session trigger ([`../../foundations/scope.md`](../../foundations/scope.md)).
- Phases 00–06, 08 complete (runtime engine + scope primitive are the parity target).

## In scope

| In | Out (this phase) |
|----|------------------|
| Remove all `apps/`; template = sole source; scaffold a fresh proof app | npm publish of `@latch/*` (Phase 07) |
| `@latch/adapter-pg-audit`, `@latch/pg-session`, `@latch/adapter-neon` (standard `pg`, dual URL) | `@neondatabase/serverless`, Neon branch provisioning (Phase 07) |
| `latch_app_config.audit_mode` migration + DAL mode gate + `--audit-mode` | Multi-company DB routing, native RLS (Phase 07) |
| `@latch/adapter-better-auth`, `@latch/app-kit` (REST + optional Actions) | New Surfaces / new runtime capability |
| **`@latch/adapter-pg-store`** (async `StoreAdapter` over `pg`) + codegen single-table store SQL; async `StoreAdapter` refactor (SQL-first, 2026-06-11) | Drizzle/ORM runtime engine (retired), multi-table glue codegen, YAML→DDL gen (toolchain ambition) |
| `011_latch_pending_changes.sql` platform migration | Per-Field/partial approval, external reviewers |
| *(optional, last)* merge server kernel — behavior parity only | Re-architecting policy/audit/approval semantics |
| *(parallel toolchain)* surface/policy JSON Schema, destructive-migration linter, `contact_list` AI-authoring proof | End-user self-service authoring UI |

## Definition of done

- [x] All eight extraction slices (tasks 01–08) verified; each old copy replaced by a `@latch/*` import.
- [x] `packages/codegen/template/` contains **zero** copied adapter glue (grep clean: no `audit-db-writer.ts`, no bespoke `audit-bootstrap.ts`).
- [x] `latch new crm_proof --audit-mode=full` produces an app that: installs (`workspace:*`), runs all platform migrations (incl. `011` + `latch_app_config`), boots auth via `@latch/adapter-better-auth`, and serves a REST read for one surface.
- [x] Trades-CRM proof (job_detail two-role parity: tech vs admin row scope + `financial_terms` omission) passes on the scaffolded app — parity with the retired `apps/crm`.
- [x] Audit modes behave per [`12-audit-opinionation.md`](../../discussions/12-audit-opinionation.md) table; threat/compartment tests green.
- [x] `npm run test`, `npm run build`, `npm run codegen:check` all green.
- [x] All prior `apps/` removed; no `packages/**` references a deleted app.

## References

- [`decisions.md`](./decisions.md) — phase-scoped decisions + links to the locked 9.x slices
- [`../../discussions/10-opinionation-roadmap.md`](../../discussions/10-opinionation-roadmap.md) — extraction sequence (source of slices)
- [`../../reference/packages.md`](../../reference/packages.md) — package boundaries (updated as packages land)
- [`../../foundations/scope.md`](../../foundations/scope.md) — v1 in/out (reconciled 2026-06-11)
- [`../02b-platform-extraction/README.md`](../02b-platform-extraction/README.md) — prior extraction lineage
