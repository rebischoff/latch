# `apps/spike_codegen` — codegen + vocabulary fixture

Disposable harness for `@latch/codegen` discovery and synthetic policy vocabulary. Sibling of [`apps/spike_policy`](../spike_policy).

## What lives here

- **Surface vocabulary** — `modules/fixture/*.surface.yaml` → `generated/*.schema.generated.ts` (`fieldIds`, actions, `kind`). Five synthetic `kind: business` surfaces for grant-matrix / manifest-inspector exercises. **No backing tables, DAL, or routes** — policy catalog only.
- **Codegen** — run from this app: `npm run codegen` / `npm run codegen:check` (scopes `LATCH_CODEGEN_APPS=spike_codegen`).

## Role seeds (template vs fixture)

| Seed | Where | Notes |
|------|-------|-------|
| `data_master`, `iam_master` | Platform template ([task 01](../../packages/policy/docs/tasks/01-role-tables.md)) | Catalog rows only; grants synthesized in `PolicyService` |
| Pilot personas (`field_tech`, `office_admin`, `union_demo_a`, `union_demo_b`, …) | **`apps/spike_policy` only** | Fixture grants against surfaces defined here; **not** copied into company DB provisioning ([P3](../../packages/policy/docs/tasks/00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty)) |

This app supplies **vocabulary** for spike_policy grant fixtures. It does not seed roles.

## Related

- [`packages/policy/docs/tasks/README.md`](../../packages/policy/docs/tasks/README.md) — runtime roles plan
- [`apps/spike_policy`](../spike_policy) — `latch_roles` DDL + pilot role fixture seeds
