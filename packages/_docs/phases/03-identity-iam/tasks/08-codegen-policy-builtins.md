# 08 — Codegen + policy built-ins (`data_master` wildcard)

> **Status:** Complete (2026-06-02). Next: [09-dal-get.md](./09-dal-get.md).

## Goal

Regenerate IAM Surface schemas; register `user_roles_detail` in the app policy registry; implement **`data_master`** auto-access in `@latch/policy` so new business Surfaces need no hand-edited `data_master` policy.

## Prerequisites

[07-policies-yaml.md](./07-policies-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/iam/generated/user_roles_detail.schema.generated.ts` | **Commit** generated |
| `apps/crm/src/lib/policy/registry.ts` | Register `user_roles_detail`; tag IAM vs business surface ids |
| `apps/crm/src/lib/policy/user-roles-detail.ts` | Finalize field ids from generated `UserRolesDetailFieldIds` |
| `packages/policy/src/policy-service.ts` | Built-in role resolver: `data_master` → wildcard grants on business surfaces |
| `packages/policy/src/registry.ts` | Allow surfaces to be tagged IAM vs business (e.g. `kind: 'iam' \| 'business'`) |
| `packages/policy/src/policy-service.test.ts` | Wildcard + `iam_master` on IAM surface only |
| [`../../../reference/access-control.md`](../../../../policy/docs/access-control.md) | Decision block for `data_master` mechanism |

## Steps

1. Run `npm run codegen` for `user_roles_detail`; commit `generated/` (no hand edits).
2. Register `defineSurfacePolicy(userRolesDetailPolicies, …)` in registry (tag it `iam`).
3. **`data_master` in `PolicyService.resolve`:** today the resolve loop only looks up `surfaceDef.roles[roleId]` per role and throws on unknown surface. Add a **built-in wildcard pass before that loop**:
   - When `principal.roles` includes `data_master` **and** the resolved `surfaceDef` is a **business** surface, synthesize a binding granting `read`/`write` on every `surfaceDef.fieldIds` + surface actions, then merge as usual (`denyWins` still applies).
   - IAM surfaces (at minimum `user_roles_detail`) are excluded — `data_master` gets no synthesized binding there.
   - Keep `data_master` out of per-Surface YAML entirely (no `data_master` block in any `*.policies.yaml`).
4. **`iam_master`:** grants on `user_roles_detail` from YAML; optional read on `latch_audit` deferred unless decided in **00**.
5. `npm run codegen:check` green.
6. Unit test: principal with only `data_master` resolves `customer_detail` + `job_detail` with admin-equivalent Field reads (or superset), and resolves a synthetic business surface registered in the test.

## Verify (stop gate)

- [x] `npm run codegen:check` passes
- [x] `iam_master` resolves `user_roles_detail` with `role_assignments` write
- [x] `data_master` resolves `job_detail` without editing per-Surface YAML when a new business Surface is registered in tests
- [x] `data_master` does **not** gain `user_roles_detail` write
- [x] No `*.policies.yaml` contains a `data_master` role block
- [x] [`../STATUS.md`](../STATUS.md) → **09-dal-get.md**

## Out of scope

DAL HTTP stack (tasks **09–13**)
Auth provider (task **14**)
