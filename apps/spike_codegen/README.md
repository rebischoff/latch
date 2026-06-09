# `apps/spike_codegen` — codegen + vocabulary fixture

Disposable harness for `@latch/codegen` discovery and typed-column smoke tests. Sibling of [`apps/spike_policy`](../spike_policy).

## What lives here

- **Surface vocabulary** — `modules/widget/*.surface.yaml` → `generated/*.schema.generated.ts` (`fieldIds`, actions, `kind`). No role grants (runtime data lives in DB per [policy task 01](../../packages/policy/docs/tasks/01-role-tables.md)).
- **Business tables** — `db/schema.ts` (e.g. `widgets`) for glue/codegen spikes.

## Role seeds (template vs fixture)

| Seed | Where | Notes |
|------|-------|-------|
| `data_master`, `iam_master` | Platform template ([task 01](../../packages/policy/docs/tasks/01-role-tables.md)) | Catalog rows only; grants synthesized in `PolicyService` |
| Pilot personas (`field_tech`, `office_admin`, …) | **`apps/spike_policy` only** | Optional fixture grants against surfaces defined here (e.g. `widget_list`); **not** copied into company DB provisioning ([P3](../../packages/policy/docs/tasks/00-decisions-needed.md#p3--seed-pilot-app-roles-or-start-the-catalog-empty)) |

This app supplies **vocabulary** for spike_policy grant fixtures. It does not seed roles.

## Related

- [`packages/policy/docs/tasks/README.md`](../../packages/policy/docs/tasks/README.md) — runtime roles plan
- [`apps/spike_policy`](../spike_policy) — proposed `latch_roles` DDL + optional pilot role fixture seeds
