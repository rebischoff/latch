# 10 — Scaffold proof (phase definition of done)

> **Status:** Complete (2026-06-11). Phase 09 closed.

## Goal

Prove the extraction end-to-end: scaffold a fresh trades-CRM app from the template via `latch new`, using only `@latch/*` imports and zero copied glue, and pass the two-role job_detail parity check that the retired `apps/crm` proved.

## Prerequisites

- Tasks 02–08 complete. (Task 09 optional.)

## Steps

1. `latch new crm_proof --audit-mode=full` (monorepo `workspace:*`).
2. Apply the full platform migration chain (identity, ops, audit, scopes, `011_latch_pending_changes`, `latch_app_config`).
3. Add the trades-CRM domain from `fixtures/crm-proof/` (Surface YAML + business migrations + seed); run `npm run codegen`.
4. Boot auth via `@latch/adapter-better-auth`; serve a REST read for `job_list`.
5. Run the two-role parity check: `field_tech` vs `office_admin` — row scope on own jobs, `financial_terms` omission, hard delete + audit.

## Verify (stop gate)

- [x] Scaffolded app installs + builds with **only** `@latch/*` deps; no copied `lib/` adapter glue.
- [x] Full platform migration chain applies cleanly on a fresh DB.
- [x] REST read works for `job_list`; auth resolves a DB-backed `Principal`.
- [x] Two-role job_detail parity passes (tech vs admin: row scope + `financial_terms` omission + delete/audit).
- [x] Audit-mode behavior matches the selected mode.
- [x] `npm run test`, `npm run build`, `npm run codegen:check` all green.
- [x] Phase 09 [README DoD](../README.md#definition-of-done) all checked; root [`STATUS.md`](../../../../STATUS.md) repointed; [`../STATUS.md`](../STATUS.md) marked complete.

## Out of scope

- npm publish (Phase 07); a second consumer app.
