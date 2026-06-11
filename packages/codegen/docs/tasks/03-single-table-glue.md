# 03 — Single-table glue generation

> **Status:** Complete (2026-06-06). Next: [04-policy-registry-gen.md](./04-policy-registry-gen.md).

## Goal

Generate the per-surface **glue** that today is hand-written — `projectRow` (read DTO ← row), `applyPatch` (row ← patch), and the surface **descriptor** — for **single-table** surfaces. **Multi-table** surfaces keep hand-written glue as the escape hatch.

Implements **Decision B**.

## Background

The DAL kernel consumes a surface **descriptor** plus projection/patch functions. Those contracts live in `@latch/dal`:

- [`packages/dal/src/surface-descriptor.ts`](../../../dal/src/surface-descriptor.ts) — descriptor shape the kernel expects.
- [`packages/dal/src/project.ts`](../../../dal/src/project.ts) — projection contract (row → manifest-narrowed DTO).
- [`packages/dal/src/patch-utils.ts`](../../../dal/src/patch-utils.ts) — patch application helpers.

> The previous hand-written examples lived in `apps/crm/src/lib/<domain>/{descriptors,project,apply-patch}.ts`; **crm is deleted**, so derive the generated shape from the `@latch/dal` contracts above and validate it against a single-table surface in `apps/spike_codegen`.

## Single-table vs. multi-table

- **Single-table** (all `fields[].columns` resolve to one table = `anchorTable`): codegen **generates** glue.
- **Multi-table** (columns span multiple tables, like the old `job_detail`): codegen **must not** generate glue — emit nothing (or a clearly-marked stub) and leave it hand-written. Detection: inspect the table prefixes across the surface's columns.

## Files

| File | Action |
|------|--------|
| `packages/codegen/src/generate.ts` (or a new `glue.ts`) | **Edit/Create** — detect single-table; emit `projectRow` / `applyPatch` / descriptor |
| `packages/codegen/src/types.ts` | **Edit** (if needed) — surface the single/multi-table determination |
| `apps/spike_codegen/modules/<surface>/generated/<id>.glue.generated.ts` | **Create** (codegen output) — committed |
| `apps/spike_codegen/...` | **Edit** — a single-table surface that exercises the generated glue end-to-end against `@latch/dal` |
| `docs/reference/metadata-and-codegen.md` | **Edit** — document glue output + the multi-table escape hatch |

## Steps

1. Read the `@latch/dal` descriptor/projection/patch contracts; define the exact generated shape.
2. Add single-table detection (one table across all columns).
3. Generate `projectRow`, `applyPatch`, and the descriptor for single-table surfaces; for multi-table, skip with a clear comment/marker.
4. Decide output file naming/placement (e.g. `<id>.glue.generated.ts`) and whether it's a separate codegen mode ([D1](./00-decisions-needed.md#d1--one-generator-with-modes-or-separate-generators)).
5. Wire a single-table spike surface through `@latch/dal` using the generated glue to prove it composes.
6. Confirm `--check` covers the new output.

## Verify (stop gate)

- [x] Single-table surface emits valid `projectRow` / `applyPatch` / descriptor consumable by `@latch/dal`
- [x] Multi-table surface emits **no** generated glue (escape hatch preserved), with a clear marker
- [x] Generated glue type-checks and a spike surface runs through the DAL kernel with it
- [x] `npm run codegen:check` covers glue output (no drift)
- [x] `docs/reference/metadata-and-codegen.md` documents glue + escape hatch

## Reference

- `@latch/dal` contracts: [`surface-descriptor.ts`](../../../dal/src/surface-descriptor.ts), [`project.ts`](../../../dal/src/project.ts), [`patch-utils.ts`](../../../dal/src/patch-utils.ts), [`create-surface-dal.ts`](../../../dal/src/create-surface-dal.ts)
- [`docs/discussions/01-codegen.md`](../../../docs/discussions/01-codegen.md) — Decision B
- [`00-decisions-needed.md`](./00-decisions-needed.md) — D1 (packaging)
