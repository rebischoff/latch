# Surface metadata and codegen

How **Surface** definitions (legacy file names may still say `*.module.yaml` until the naming pass) and **Field** definitions drive generated types, Zod schemas, and DAL mappings.

A Surface is one form and/or list page, may join many tables/views, and a table may appear in multiple Surfaces. See [`glossary.md`](../foundations/glossary.md).

> **Paths reflect the monorepo target** ([`packages.md`](./packages.md)). Source YAML lives in `apps/web/modules/<surface>/`; the codegen CLI lives in `packages/codegen`; generated TS is committed to `apps/web/modules/<surface>/generated/`.

## Decision: codegen-first for structure (2026-05)

**Choice:** Module definitions live in repo (YAML/JSON). A codegen step produces TypeScript that would otherwise drift if hand-maintained. **Domain validation** (business rules) remains hand-written and composes on top of generated base schemas.

**Rationale:** Field IDs, physical column maps, and API shapes must match metadata exactly; codegen reduces errors and speeds development.

## Module definition (illustrative)

```yaml
# modules/contract/contract.module.yaml
id: contract
displayName: Contract
mainTable: contracts
fields:
  - id: title
    columns: [contracts.title]
  - id: financial_terms
    columns: [contracts.payment_terms, contracts.liability_cap]
    requires_verification: true
  - id: salary_band
    columns: [contracts.salary_band]
    sensitivity: high
```

### Decision: `requires_verification` on Field (2026-06-03)

**Choice:** Optional `requires_verification: true` on a Field in `*.surface.yaml`. Codegen emits `${SurfacePascal}VerificationFieldIds` (tuple of Field ids) and `${SurfacePascal}VerificationFieldId` in `generated/<surface>.schema.generated.ts`. Omitted or false → Field is not listed in the constant.

**Rationale:** Structural eligibility for verification is metadata-driven and stable for DAL/tests; runtime routing still requires manifest `submit` ∧ ¬`write` (hybrid gating — see [Phase 05 decisions](../phases/05-verification/decisions.md)).

Example emit (`job_detail`):

```ts
export const JobDetailVerificationFieldIds = ["financial_terms"] as const;
export type JobDetailVerificationFieldId = (typeof JobDetailVerificationFieldIds)[number];
```

### Decision: policy bindings in repo (2026-05-27)

**Choice:** Role → Module/Field policy bindings live in **repo YAML/JSON** alongside Module structure (e.g. `contract.policies.yaml`), reviewed in PRs. Structural Module definition and policies share the same lifecycle.

**Rationale:** Same review workflow as schema; avoids drift between codegen and runtime policy tables in v1.

## What codegen emits

| Artifact | Purpose |
|----------|---------|
| `ContractFieldIds` | Stable constants for policies, UI, audit |
| `ContractSchema` | Base Zod object (all columns for Module) |
| `contractColumnMap` | Field ID → physical columns for DAL |
| `${Surface}VerificationFieldIds` | Field ids with `requires_verification: true` (DAL pending routing) |
| Optional: RLS policy stubs, migration hints | Later phases |

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
apps/web/modules/job/job.surface.yaml          # target: modes list | detail
  (transitional: job_list.surface.yaml + job_detail.surface.yaml)
       │
       ▼  npm run codegen (or watch)
apps/web/modules/job/generated/*.ts
       │
       ├── PolicyService (base + mode overlay)  (packages/policy)
       ├── DAL (column projection per mode)     (packages/dal)
       ├── API (Zod parse)                      (apps/web route handlers + actions)
       └── UI (Field IDs for controls)          (apps/web + packages/react)
```

CI runs `codegen --check`; drift between YAML and committed generated files fails the build (threat T11).

## Related

- [`packages.md`](./packages.md)
- [`permissions-and-ui-sync.md`](./permissions-and-ui-sync.md)
- [`access-control.md`](./access-control.md)
- [`../threat-model.md`](../foundations/threat-model.md) (T11, T13)
