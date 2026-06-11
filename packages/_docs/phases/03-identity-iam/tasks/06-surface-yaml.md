# 06 — `user_roles_detail.surface.yaml`

> **Status:** Complete (2026-06-02). Next: [07-policies-yaml.md](./07-policies-yaml.md).

## Goal

Author IAM Surface metadata for role assignment (threat **T8**). Metadata only — no policies or codegen in this task.

## Prerequisites

[05-principal-db-roles.md](./05-principal-db-roles.md) complete.
Locked sketch in [`../decisions.md`](../decisions.md).

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/iam/user_roles_detail.surface.yaml` | **Create** |

## Steps

1. Read [`../../../reference/metadata-and-codegen.md`](../../../../codegen/docs/reference/metadata-and-codegen.md).
2. **Create** `user_roles_detail`:
   - `id: user_roles_detail`, `displayName: User roles`, `anchorTable: latch_users`
   - `tables`: `latch_users`, `latch_user_roles`
   - Fields (locked in task 00):
     - `profile` → `latch_users.id`, `latch_users.display_name`
     - `role_assignments` → logical projection of `latch_user_roles.role_id` for the anchor user (array of role id strings in DAL)
3. Mark IAM Surface in module metadata comment (excluded from `data_master` wildcard list in task **08**).

## Verify (stop gate)

- [x] YAML parses; `id` is `user_roles_detail`
- [x] Field ids are `snake_case`
- [x] No hand-edited files under `generated/` yet
- [x] [`../STATUS.md`](../STATUS.md) → **07-policies-yaml.md**

## Out of scope

Policies, codegen, DAL, API, Auth.js.
