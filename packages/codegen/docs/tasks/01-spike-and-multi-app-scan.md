# 01 — Spike harness + multi-app scan

> **Status:** Complete (2026-06-06). Next: [02-types-in-yaml.md](./02-types-in-yaml.md).

## Goal

Make codegen **discover surfaces in any app**, and create the disposable `apps/spike_codegen` it will run against. After this task, `npm run codegen` writes generated TS under `apps/spike_codegen/modules/**/generated/` (and any other app's `modules/`), and `npm run codegen:check` passes with no crm dependency.

This task implements **Point 3** (scan all apps) and lands the [discussion decision](../../../docs/discussions/01-codegen.md#decision-evaluate-via-a-spike-app-retire-crmtest1-2026-06-05) to retire crm/test1.

## Why this is one task

The scan-root change is meaningless without an app to scan, and deleting crm removes the *current* scan target — so codegen would throw in between. Removing crm/test1, scaffolding the spike, and generalizing the root are one atomic change.

## Current coupling (what we're removing)

`packages/codegen/src/generate.ts` hardcodes the only scan root:

```
const MODULES_ROOT = path.join(REPO_ROOT, "apps/crm/modules");
```

and `run.ts` throws `"No *.surface.yaml files found under apps/crm/modules/"`. Both are crm-specific.

## Files

| File | Action |
|------|--------|
| `apps/crm/` | **Delete** — entire app (accepted: loses e2e/threat coverage; see decision) |
| `apps/test1/` | **Delete** — entire app (redundant half-built scaffold) |
| `apps/spike_codegen/package.json` | **Create** — minimal workspace member (name `@latch/spike-codegen`, private) |
| `apps/spike_codegen/tsconfig.json` | **Create** — so generated TS type-checks |
| `apps/spike_codegen/modules/.gitkeep` | **Create** — scan root for surface YAML (real surface added in task 02/03) |
| `apps/spike_codegen/db/schema.ts` | **Create** — tiny Drizzle schema (needed by task 02's cross-check) |
| `packages/codegen/src/generate.ts` | **Edit** — replace `MODULES_ROOT` with a multi-root scan over `apps/*/modules/**` (or `LATCH_CODEGEN_APPS` allow-list) |
| `packages/codegen/src/run.ts` | **Edit** — generalize the "no surfaces found" error message |
| Root `package.json` | **Edit** — repoint/remove `dev`/`build`/`start`/`restore-audit` (crm) and `dev:test1`/`db:migrate:test1`/`db:check:test1` (test1) |

> **No salvage:** per the locked decision, engine/threat tests in `apps/crm` are **not** carried over. Only `packages/*` unit tests remain.

## Steps

1. Delete `apps/crm` and `apps/test1`.
2. Scaffold `apps/spike_codegen` as a thin workspace member: `package.json`, `tsconfig.json`, empty `modules/`, minimal `db/schema.ts`. **No** Next.js, auth, UI, or migration runner.
3. In `generate.ts`, replace the single `MODULES_ROOT` with discovery across `apps/*/modules/` — glob app dirs, scan each for `*.surface.yaml`. Skip apps with no `modules/` dir gracefully. Output path stays `<moduleDir>/generated/<id>.schema.generated.ts` (already relative to each YAML).
4. Update `run.ts`'s empty-result error to name the general root, not crm.
5. Fix root `package.json` scripts so `npm run dev` etc. don't reference deleted apps.
6. Confirm `npm run codegen` and `npm run codegen:check` run without a crm dependency (empty result is acceptable until a surface exists, or add a throwaway surface to smoke-test discovery).

## Decisions / notes

- **Scan strategy:** convention `apps/*/modules/**` (implemented). Optional `LATCH_CODEGEN_APPS` comma-separated allow-list is wired but unused — add only if discovery proves too broad.
- Does **not** touch type resolution — `COLUMN_ZOD` stays until task [02](./02-types-in-yaml.md). A spike surface authored before task 02 will emit `z.unknown()` for unknown columns; that's expected and is the motivation for 02.

## Verify (stop gate)

- [x] `apps/crm` and `apps/test1` no longer exist
- [x] `apps/spike_codegen` exists as a workspace member and type-checks
- [x] `npm run codegen` discovers surfaces under `apps/*/modules/**` (verified against a spike surface), with no reference to a crm-specific path
- [x] `npm run codegen:check` exits 0 with no drift and no crm dependency
- [x] Root `package.json` has no scripts pointing at deleted apps
- [x] `npm run test` passes (packages-only suite)

## Out of scope

| Item | Where |
|------|-------|
| YAML-declared types / dropping `COLUMN_ZOD` | task [02](./02-types-in-yaml.md) |
| Glue generation | task [03](./03-single-table-glue.md) |
| Policy registry generation | task [04](./04-policy-registry-gen.md) |
| Stale doc links in root/phase `STATUS.md` referencing crm | docs hygiene (separate pass) |

## Reference

- [`packages/codegen/src/generate.ts`](../../src/generate.ts), [`run.ts`](../../src/run.ts), [`cli.ts`](../../src/cli.ts)
- [`docs/discussions/01-codegen.md`](../../../docs/discussions/01-codegen.md)
