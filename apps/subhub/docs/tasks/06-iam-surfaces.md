# 06 — IAM surfaces

## Goal

Surface YAML for users, roles, and user-role assignment; codegen + policy registry.

## Prerequisites

[05-nav-manifest.md](./05-nav-manifest.md) complete.

## Files

| File | Action |
|------|--------|
| `modules/iam/user_list.surface.yaml` | **Create** |
| `modules/iam/user_detail.surface.yaml` | **Create** |
| `modules/iam/role_list.surface.yaml` | **Create** |
| `modules/iam/role_detail.surface.yaml` | **Create** |
| `modules/iam/user_roles_detail.surface.yaml` | **Create** — per Phase 03 sketch |
| `lib/policy-registry.ts` | Register generated `*SurfacePolicyDef` |
| `modules/iam/generated/*` | Via `npm run codegen` |

## Steps

1. Anchor tables: `latch_users`, `latch_roles`, `latch_user_roles`, `latch_role_grants` as appropriate per surface.
2. Field ids: `profile`, `role_assignments`, `grants`, etc. — `snake_case`.
3. Column entries use `{ column, type }` objects.
4. Run `npm run codegen -w @latch/subhub`; wire registry.
5. **No** `*.policies.yaml` — grants come from DB seeds (task **09**).

## Verify (stop gate)

- [ ] `npm run codegen:check -w @latch/subhub` passes
- [ ] Registry imports all IAM `*SurfacePolicyDef`
- [ ] [`../../STATUS.md`](../../STATUS.md) → [07-iam-dal-api.md](./07-iam-dal-api.md)

## Out of scope

- DAL, API, UI
- Runtime grant editing logic (task **07**)

## Reference

- [Phase 03 IAM decisions](../../../../packages/_docs/phases/03-identity-iam/decisions.md)
