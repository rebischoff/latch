# Surface metadata and codegen

How **Surface** definitions (legacy file names may still say `*.module.yaml` until the naming pass) and **Field** definitions drive generated types, Zod schemas, and DAL mappings.

A Surface is one form and/or list page, may join many tables/views, and a table may appear in multiple Surfaces. See [`glossary.md`](../foundations/glossary.md).

> **Paths reflect the monorepo target** ([`packages.md`](./packages.md)). Source YAML lives in `apps/<app>/modules/<surface>/`; the codegen CLI lives in `packages/codegen`; generated TS is committed to `apps/<app>/modules/<surface>/generated/`.

## Decision: codegen-first for structure (2026-05)

**Choice:** Module definitions live in repo (YAML/JSON). A codegen step produces TypeScript that would otherwise drift if hand-maintained. **Domain validation** (business rules) remains hand-written and composes on top of generated base schemas.

**Rationale:** Field IDs, physical column maps, and API shapes must match metadata exactly; codegen reduces errors and speeds development.

## Surface definition (illustrative)

```yaml
# apps/<app>/modules/contract/contract.surface.yaml
id: contract
displayName: Contract
anchorTable: contracts
tables:
  - contracts
fields:
  - id: title
    columns:
      - column: contracts.title
        type: string
  - id: financial_terms
    columns:
      - column: contracts.payment_terms
        type: string
        nullable: true
      - column: contracts.liability_cap
        type: number
        nullable: true
    requires_verification: true
  - id: salary_band
    columns:
      - column: contracts.salary_band
        type: string
        nullable: true
    sensitivity: high
```

### Decision: column types declared in YAML (2026-06-06)

**Choice:** Each entry in `fields[].columns` is an object `{ column, type, nullable? }`. The generator maps a **closed vocabulary** of `type` values to Zod fragments (`string`, `number`, `boolean`, `timestamp`). The hardcoded `COLUMN_ZOD` map in `@latch/codegen` is removed — new apps need no in-package type table.

**Rationale:** Column types feed Zod validation (spine). Declaring them in YAML keeps codegen app-agnostic; a closed vocabulary keeps emission total and enables a future Drizzle cross-check in `--check` (mechanism TBD — see [`packages/codegen/docs/tasks/00-decisions-needed.md`](../../packages/codegen/docs/tasks/00-decisions-needed.md#d2--how-does---check-cross-check-types-against-drizzle)).

| YAML `type` | Zod emitted | Notes |
|-------------|-------------|-------|
| `string` | `z.string()` | Text / UUID / enum-as-text columns |
| `number` | `z.number()` | Numeric columns |
| `boolean` | `z.boolean()` | |
| `timestamp` | `z.string()` | ISO timestamps serialized as strings |

When `nullable: true`, the generator appends `.nullable()` (e.g. `z.string().nullable()`). Omitted or false → non-nullable in the base schema.

### Decision: `requires_verification` on Field (2026-06-03)

**Choice:** Optional `requires_verification: true` on a Field in `*.surface.yaml`. Codegen emits `${SurfacePascal}VerificationFieldIds` (tuple of Field ids) and `${SurfacePascal}VerificationFieldId` in `generated/<surface>.schema.generated.ts`. Omitted or false → Field is not listed in the constant.

**Rationale:** Structural eligibility for verification is metadata-driven and stable for DAL/tests; runtime routing still requires manifest `submit` ∧ ¬`write` (hybrid gating — see [Phase 05 decisions](../phases/05-verification/decisions.md)).

Example emit (`job_detail`):

```ts
export const JobDetailVerificationFieldIds = ["financial_terms"] as const;
export type JobDetailVerificationFieldId = (typeof JobDetailVerificationFieldIds)[number];
```

### Decision: policy bindings in repo (2026-05-27)

> **Superseded for grants (2026-06-06):** role→Field **grants** are **runtime DB data** (`latch_roles` + `latch_role_grants`), not repo YAML. Policy **vocabulary** (`kind`, action sets) lives in `*.surface.yaml` and is emitted into `*.schema.generated.ts`. `*.policies.yaml` is retired. See below and [`access-control.md`](./access-control.md#decision-app-defined-roles-are-runtime-data-2026-06-06).

**Choice:** Role → Module/Field policy bindings live in **repo YAML/JSON** alongside Module structure (e.g. `contract.policies.yaml`), reviewed in PRs. Structural Module definition and policies share the same lifecycle.

**Rationale:** Same review workflow as schema; avoids drift between codegen and runtime policy tables in v1.

## What codegen emits

| Artifact | File | Purpose |
|----------|------|---------|
| `${Surface}FieldIds` | `<id>.schema.generated.ts` | Stable constants for policies, UI, audit |
| `${Surface}Schema` / `${Surface}PatchSchema` | `<id>.schema.generated.ts` | Base Zod read/patch shapes (narrow at runtime) |
| `${surface}ColumnMap` | `<id>.schema.generated.ts` | Field id → physical columns |
| `${Surface}VerificationFieldIds` | `<id>.schema.generated.ts` | Field ids with `requires_verification: true` (DAL pending routing) |
| `${surface}Descriptor` (+ `projectRow` / `applyPatch`) | `<id>.glue.generated.ts` | Single-table DAL glue (see below) |
| `MULTI_TABLE_GLUE_SKIPPED` marker | `<id>.glue.generated.ts` | Multi-table escape hatch — no generated glue |
| `${surface}SurfacePolicyDef` | `<id>.schema.generated.ts` | Field/action **vocabulary** catalog (`fieldIds` / `kind` / actions) for `PolicyService`; **no role grants** (runtime DB data as of 2026-06-06) |
| Optional: RLS policy stubs, migration hints | — | Later phases |

### Decision: single-table glue generation (2026-06-06)

**Choice:** For **single-table** surfaces (every `fields[].columns` entry resolves to the same table as `anchorTable`), codegen emits `projectRow`, `applyPatch`, and a `SurfaceDescriptor` in `generated/<id>.glue.generated.ts`. **Multi-table** surfaces (columns span more than one table) emit **no** glue logic — only a `MULTI_TABLE_GLUE_SKIPPED` marker and the table list so implementors hand-write glue in the module.

**Rationale:** Implements [Decision B](../../docs/discussions/01-codegen.md) — remove repetitive single-table boilerplate while preserving an explicit escape hatch for joined surfaces (e.g. old `job_detail` spanning `jobs` + `customers` + `sites`). Glue is generated in the same `npm run codegen` pass as structure (separate committed file, same `--check` drift gate).

Single-table emit (illustrative):

```ts
// generated/widget_list.glue.generated.ts — DO NOT EDIT
import type { SurfaceDescriptor } from "@latch/dal";
import { WidgetListPatchSchema } from "./widget_list.schema.generated.js";

export const projectWidgetListRow = (row, manifest, ...) => { /* manifest-narrowed projection */ };
export const applyWidgetListPatch = (row, patch) => { /* column-backed patch */ };

export const widgetListDescriptor: SurfaceDescriptor<WidgetListRow> = {
  surfaceId: "widget_list",
  anchorTable: "widgets",
  capabilities: ["list"],
  patchSchema: WidgetListPatchSchema,
  projectRow: projectWidgetListRow,
  applyPatch: applyWidgetListPatch,
  auditSnapshot: formatWidgetListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
```

Multi-table emit (escape hatch):

```ts
// generated/widget_join.glue.generated.ts — DO NOT EDIT
/** MULTI_TABLE_GLUE_SKIPPED — columns span multiple tables (widget_tags, widgets). */
export const MULTI_TABLE_GLUE_SKIPPED = true as const;
export const MULTI_TABLE_GLUE_TABLES = ["widget_tags", "widgets"] as const;
```

Capabilities (`detail` vs `list`) are inferred from the surface id suffix (`*_list` → list, `*_detail` → detail; default `detail`). List surfaces also get a generated `ListQuerySchema` (`status` / `limit` / `offset`).

### Decision: policy vocabulary from `*.surface.yaml` (2026-06-06)

> **Re-scoped same day (2026-06-06) — roles are runtime data; `*.policies.yaml` retired.** Codegen emits the per-Surface Field/action **vocabulary** catalog from `*.surface.yaml` into `generated/<id>.schema.generated.ts` as `${surface}SurfacePolicyDef`. Role grants are **runtime DB rows** (`latch_role_grants`), resolved via `RoleGrantProvider` in `@latch/policy`. Grant validation is **write-time** in the role editor (against this catalog). See [codegen task 04](../../packages/codegen/docs/tasks/04-policy-registry-gen.md).

**Choice:** `*.surface.yaml` declares optional `kind`, `fieldActions`, `surfaceActions`, and `modes`. Codegen emits `${surface}SurfacePolicyDef` — a `defineSurfacePolicy({ ... })` catalog in the same file as `${Surface}FieldIds` and Zod schemas. `data_master` stays synthesized in `PolicyService`. No separate `*.policies.yaml` or `*.policies.generated.ts`.

**Rationale:** Field ids and policy vocabulary share one surface definition; a second policies file duplicated schema data without adding a distinct lifecycle.

Authoring shape (illustrative):

```yaml
# apps/<app>/modules/widget/widget_list.surface.yaml
id: widget_list
kind: business          # optional; default business. Use iam for IAM surfaces.
fieldActions: [read, write]    # optional; defaults to full closed set
surfaceActions: [read, write]  # optional; defaults to full closed set
modes: [list]             # optional screen modes
fields:
  - id: summary
    columns: [...]
```

Generated emit (illustrative):

```ts
// generated/widget_list.schema.generated.ts — DO NOT EDIT
import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const WidgetListFieldIds = { summary: "summary", status: "status" } as const;
// ... Zod schemas ...

export const widgetListSurfacePolicyDef = defineSurfacePolicy({
  surface: "widget_list",
  fieldIds: Object.values(WidgetListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "business",
});
```

The app assembles `definePolicyRegistry(...imports from *.schema.generated.ts)` and wires a DB-backed `RoleGrantProvider` at bootstrap.

Example output shape:

```ts
// generated/contract.schema.ts — DO NOT EDIT
import { z } from "zod";

export const ContractFieldIds = {
  title: "title",
  financial_terms: "financial_terms",
  salary_band: "salary_band",
} as const;

export const ContractSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  payment_terms: z.string().nullable(),
  liability_cap: z.number().nullable(),
  salary_band: z.string().nullable(),
});
```

## Runtime narrowing (not generated)

After `PolicyService.resolve()`:

```ts
// Pseudocode
const readable = narrowSchema(ContractSchema, manifest, "read");
const writable = narrowSchema(ContractSchema, manifest, "write").strict();
```

Writable schema and DAL must allow the **same** Field set.

## Hand-written layer

```ts
// contract.rules.ts
export const ContractBusinessRules = ContractSchema.refine(
  (data) => !data.endDate || data.endDate >= data.startDate,
  { message: "End date must be on or after start date" }
);
```

Apply business rules only after authz and structural parse.

### Decision: structure YAML may vary by mode (2026-06-01)

**Choice:** One Surface id (e.g. `job`) may declare **per-mode Field lists** (which Fields/columns appear on list vs detail). **Role policy is not duplicated per mode** — see [access-control.md](./access-control.md) (**list and detail are modes**). Codegen may emit separate Zod shapes per mode (`list` row vs `detail` DTO) from one or more structure files.

**Rationale:** List and detail need different projections (e.g. `customer_site` on list, `scope` on detail) without maintaining two role matrices.

## Workflow

```text
apps/<app>/modules/job/job.surface.yaml        # target: modes list | detail
  (transitional: job_list.surface.yaml + job_detail.surface.yaml)
apps/<app>/modules/job/job.surface.yaml        # structure + policy vocabulary (kind, actions)
       │
       ▼  npm run codegen (or watch)
apps/<app>/modules/job/generated/*.schema.generated.ts   # FieldIds, Zod, ${surface}SurfacePolicyDef
apps/<app>/modules/job/generated/*.glue.generated.ts
       │
       ├── PolicyService (base + mode overlay)  (packages/policy)
       ├── DAL (column projection per mode)     (packages/dal)
       ├── API (Zod parse)                      (app route handlers + actions)
       └── UI (Field IDs for controls)          (app + packages/react)
```

CI runs `codegen --check`; drift between YAML and committed generated files fails the build (threat T11).

## Related

- [`codegen-scope.md`](./codegen-scope.md) — what codegen owns / verifies / must not own
- [`packages.md`](./packages.md)
- [`permissions-and-ui-sync.md`](./permissions-and-ui-sync.md)
- [`access-control.md`](./access-control.md)
- [`../threat-model.md`](../foundations/threat-model.md) (T11, T13)
