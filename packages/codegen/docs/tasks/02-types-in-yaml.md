# 02 — Types in YAML (drop `COLUMN_ZOD`)

> **Status:** Complete (2026-06-06). Depends on [01](./01-spike-and-multi-app-scan.md). Next: [03-single-table-glue.md](./03-single-table-glue.md).

## Goal

Make column types **app-agnostic**: declare each column's type in the surface YAML and emit Zod from that, **deleting** the hardcoded `COLUMN_ZOD` map. After this, a brand-new app (the spike) produces real Zod schemas with **no `z.unknown()`** fallbacks and **no entries in any in-package type table**.

Implements **Decision A**. This is the second of the two "make codegen generic" beats (task 01 = discovery, task 02 = types).

## Current coupling (what we're removing)

`packages/codegen/src/generate.ts` resolves types from a crm-flavoured map and silently degrades unknown columns:

```
const COLUMN_ZOD: Record<string, string> = { "jobs.id": "z.string()", ... };
const zodForColumn = (qualifiedColumn) => COLUMN_ZOD[qualifiedColumn] ?? "z.unknown()";
```

Any column not pre-listed becomes `z.unknown()` — useless for a new app. That map is the last app-specific coupling after task 01.

## Files

| File | Action |
|------|--------|
| `packages/codegen/src/types.ts` | **Edit** — extend `SurfaceFieldDef` so columns carry a declared type (shape per [D3](./00-decisions-needed.md#d3--column-type-declaration-shape-in-yaml)) |
| `packages/codegen/src/generate.ts` | **Edit** — **delete** `COLUMN_ZOD` + `zodForColumn` fallback; emit Zod from the declared type; update `parseSurfaceYaml` validation |
| `apps/spike_codegen/modules/<surface>/<id>.surface.yaml` | **Create/Edit** — first real surface with typed columns |
| `apps/spike_codegen/modules/<surface>/generated/<id>.schema.generated.ts` | **Create** (codegen output) — commit |
| `apps/spike_codegen/db/schema.ts` | **Edit** — Drizzle table(s) matching the surface (cross-check target) |
| `docs/reference/metadata-and-codegen.md` | **Edit** — document the type-in-YAML format; note `COLUMN_ZOD` removed |

## Steps

1. **Decide the declaration shape** ([D3](./00-decisions-needed.md#d3--column-type-declaration-shape-in-yaml)) — per-column object `{ column, type, nullable? }` (see Decision block in [00](./00-decisions-needed.md)).
2. Update `SurfaceFieldDef` + `parseSurfaceYaml` to require/validate a type per column.
3. Replace `zodForColumn` with a `type → Zod fragment` mapping over a **small, closed type vocabulary** (e.g. `string`, `number`, `boolean`, `timestamp`, …) — generic, not per-table. Honour `nullable`.
4. **Delete** the `COLUMN_ZOD` map and its imports.
5. Author one typed surface in the spike; run `npm run codegen`; confirm the generated Zod has concrete types and **zero** `z.unknown()`.
6. **Cross-check vs. Drizzle** ([D2](./00-decisions-needed.md#d2--how-does---check-cross-check-types-against-drizzle)): **deferred** — YAML-declared types shipped; Drizzle reconciliation tracked in [00](./00-decisions-needed.md).

## Decisions / notes

- **D3 (2026-06-06):** per-column object `{ column, type, nullable? }`; closed type vocabulary `string | number | boolean | timestamp`.

- **Type vocabulary is opinionated/closed** (spine): the set of allowed `type` values is fixed by the generator, not free-form per app — keeps Zod generation total and the cross-check tractable.
- The join-backed empty-column case (`fields[].columns: []` → `z.array(z.object({ user_id: z.string() }))`) needs a typed equivalent or an explicit "relation field" marker; decide while authoring the spike surface.

## Verify (stop gate)

- [x] `COLUMN_ZOD` and the `z.unknown()` fallback are gone from `generate.ts`
- [x] Surface YAML declares a type per column; `parseSurfaceYaml` rejects a missing/invalid type
- [x] Spike's generated schema has concrete Zod types and **no** `z.unknown()`
- [x] `npm run codegen:check` passes for the spike
- [x] Drizzle cross-check explicitly deferred per [D2](./00-decisions-needed.md#d2--how-does---check-cross-check-types-against-drizzle) (tracked in 00)
- [x] `docs/reference/metadata-and-codegen.md` documents the type format

## Reference

- [`packages/codegen/src/generate.ts`](../../src/generate.ts) (lines defining `COLUMN_ZOD` / `zodForColumn`), [`types.ts`](../../src/types.ts)
- [`docs/discussions/01-codegen.md`](../../../docs/discussions/01-codegen.md) — Decision A
- [`00-decisions-needed.md`](./00-decisions-needed.md) — D2, D3
