# 08 — Codegen for `job_list`

## Goal

`npm run codegen` and `npm run codegen:check` emit committed TS for `job_list` under `apps/web/modules/job/generated/`.

## Prerequisites

[07-policies-yaml.md](./07-policies-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/modules/job/generated/job_list.schema.generated.ts` | **Commit** generated output |
| `packages/codegen/src/generate.ts` | Extend if needed to discover `job_list.surface.yaml` |
| Root `package.json` | Confirm `codegen`, `codegen:check` scripts (already exist from pilot) |

## Steps

1. Emit: `JobListFieldIds`, column map, base/list-row Zod schemas, bulk patch schema shell.
2. Header: `DO NOT EDIT — generated from job_list.surface.yaml`.
3. Run `npm run codegen` then `npm run codegen:check` (T11).
4. Commit `generated/` artifacts; no hand-edits under `generated/`.

## Verify (stop gate)

- [ ] `npm run codegen:check` passes
- [ ] Generated file references `job_list` surface id
- [ ] [`../STATUS.md`](../STATUS.md) → **09-dal-list.md**

## Out of scope

Runtime policy load from YAML; DAL `list` implementation.
