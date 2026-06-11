# 05 — Surface YAML `requires_verification` + codegen

> **Status:** Complete (2026-06-03). Next: [06-dal-pending-routing.md](./06-dal-pending-routing.md).

## Goal

Declare **`requires_verification: true`** on pilot Field `financial_terms` in `job_detail.surface.yaml`; extend codegen to emit verification Field-id constants for DAL consumption.

## Prerequisites

- [04-db-schema.md](./04-db-schema.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/job/job_detail.surface.yaml` | `requires_verification: true` on `financial_terms` |
| `packages/codegen/src/types.ts` | Add `requires_verification?: boolean` to `SurfaceFieldDef` |
| `packages/codegen/src/generate.ts` | **Net-new emit** of a verification Field-id constant |
| `apps/crm/modules/job/generated/job_detail.schema.generated.ts` | Regenerated artifact |

## Codegen reality (read first)

- `SurfaceFieldDef` does **not** model `requires_verification` today — add it (step 1). Adding the YAML key alone won't break `codegen:check` because `parse(raw) as SurfaceDef` ignores unknown keys; the flag is simply dropped until `generate.ts` emits it.
- There is **no existing emit precedent** to copy: `sensitivity` is parsed into the type but never written to the generated file. So emitting verification ids is new output, not a tweak.
- Decide the emitted name and shape, e.g.:

```ts
export const JobDetailVerificationFieldIds = ["financial_terms"] as const;
export type JobDetailVerificationFieldId = (typeof JobDetailVerificationFieldIds)[number];
```

  The DAL (task **06**) imports this set; confirm the import path before task **06** starts.

## Steps

1. Add `requires_verification?: boolean` to `SurfaceFieldDef`; set the flag in `job_detail.surface.yaml`.
2. Emit the verification constant in `generateSurfaceFile` (only Fields with the flag).
3. Document YAML shape + emitted constant in [`metadata-and-codegen.md`](../../../../codegen/docs/reference/metadata-and-codegen.md) (short Decision block).
4. Run `npm run codegen` / `codegen:check`.

## Verify (stop gate)

- [x] `SurfaceFieldDef` models `requires_verification`
- [x] Generated file exports the verification Field-id constant for `job_detail` (contains `financial_terms`)
- [x] `npm run codegen:check` passes (committed generated file matches)
- [x] [`../STATUS.md`](../STATUS.md) **Execute now** → `06-dal-pending-routing.md`

## Out of scope

DAL wiring (task **06**). `job_list` surface yaml unless bulk needs explicit flag (inherit or duplicate per decisions).
