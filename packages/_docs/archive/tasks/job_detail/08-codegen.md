# 08 — `@latch/codegen` CLI

## Goal

`npm run codegen` and `npm run codegen --check` emit committed TS under `apps/web/modules/job/generated/`.

## Prerequisites

[07-policies-yaml.md](./07-policies-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/codegen/package.json` | `yaml` dep; scripts `generate`, `check` |
| `packages/codegen/src/generate.ts` | Parse surface YAML → TS |
| `packages/codegen/src/cli.ts` | `--check` compares to committed file |
| `apps/web/modules/job/generated/job_detail.schema.generated.ts` | **Commit** generated output |
| Root `package.json` | `"codegen"`, `"codegen:check"` scripts |

## Steps

1. Emit: `JobDetailFieldIds`, `jobDetailColumnMap`, base/patch Zod schemas.
2. Header: `DO NOT EDIT — generated from job_detail.surface.yaml`.
3. `--check` exits non-zero on drift (T11).
4. Run `npm run codegen` then commit `generated/`.

## Verify (stop gate)

- [x] `npm run codegen:check` passes
- [x] CI can run `codegen:check` (wire in task 21 if needed)
- [x] `STATUS.md` → **09-dal-read.md**

## Out of scope

Runtime policy load from YAML.
