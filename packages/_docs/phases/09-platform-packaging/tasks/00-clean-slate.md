# 00 — Clean slate

> **Status:** Complete (2026-06-11). Next: [02-adapter-pg-audit.md](./02-adapter-pg-audit.md).

## Goal

Remove all `apps/` and repoint repo tooling so the **template** (`packages/codegen/template/`) is the only consumer source. Preserve the trades-CRM domain (Surface YAML, migrations, seed) as **fixtures** so the proof app (task 10) can be scaffolded and exercised. No `@latch/*` package code changes here.

## Prerequisites

- [`../decisions.md`](../decisions.md) "clean slate" + "CRM fixtures home" open item locked.

## Files

| File / dir | Action |
|------------|--------|
| `apps/crm`, `apps/widgets`, `apps/spike_policy`, `apps/spike_business`, `apps/spike_codegen` | Remove (git rm) |
| `fixtures/crm-proof/` (new) | Preserve job/customer Surface YAML, migrations, seed from `apps/crm` for the proof |
| root `package.json` | Drop `apps/*` from workspaces; keep `packages/*` + template build wiring |
| `tsconfig*.json`, `eslint.config.mjs` | Remove `apps/*` paths/refs |
| `scripts/db-migrate.mjs` | Repoint default target off `apps/crm` (template / scaffolded app cwd) |
| `@latch/codegen` scan root | Ensure cwd/config-anchored (not `apps/crm`); see [`01-codegen.md`](../../../discussions/01-codegen.md) portability note |

## Steps

1. Lift the CRM domain fixtures needed for the task-10 proof into `fixtures/crm-proof/`.
2. `git rm -r` the apps; drop them from workspaces and tsconfig/eslint.
3. Repoint codegen scan root + db-migrate target so they no longer assume `apps/crm`.
4. Confirm `npm install` + `npm run build` succeed with packages + template only.

## Verify (stop gate)

- [x] No `apps/` directory remains; workspaces list packages + template only.
- [x] `npm install` and `npm run build` green with no app present.
- [x] No `packages/**` or root config references a removed app (grep clean).
- [x] CRM proof fixtures preserved under `fixtures/crm-proof/`.
- [x] [`../STATUS.md`](../STATUS.md) Right-now → `02-adapter-pg-audit.md`.

## Out of scope

- Creating any new `@latch/*` package (starts task 02).
- Scaffolding the proof app (task 10).
