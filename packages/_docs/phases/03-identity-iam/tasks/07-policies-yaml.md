# 07 — `user_roles_detail.policies.yaml` + built-in role notes

> **Status:** Complete (2026-06-02). Next: [08-codegen-policy-builtins.md](./08-codegen-policy-builtins.md).

## Goal

Role → Field grants for `user_roles_detail` (`iam_master` only). Document built-in roles in YAML comments; engine-level `data_master` wildcard lands in task **08**.

## Prerequisites

[06-surface-yaml.md](./06-surface-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/iam/user_roles_detail.policies.yaml` | **Create** |
| `apps/crm/src/lib/policy/user-roles-detail.ts` | **Create** — mirror [`customer-detail.ts`](../../../../../apps/crm/src/lib/policy/customer-detail.ts) |
| `apps/crm/src/lib/policy/registry.ts` | Prepare import (registration in **08**) |

## Steps

1. **`user_roles_detail.policies.yaml`:**
   - `surface: user_roles_detail`
   - **`iam_master` only:** `rowScope: all`; Surface actions `read`, `write`
   - Fields: `profile` → `read`; `role_assignments` → `read`, `write`
   - **No** bindings for `field_tech`, `office_admin`, `data_master`
2. **Default deny:** principals without `iam_master` get no Surface binding (empty manifest / 404 on get).
3. Mirror into TypeScript policy module.
4. **Built-in catalog** — add comment block listing `iam_master` / `data_master` behavior; `data_master` policy file is **not** per-Surface YAML (engine wildcard per decisions).

## Verify (stop gate)

- [x] YAML parses
- [x] Only `iam_master` has a role block
- [x] `field_tech` cannot resolve write on `role_assignments` (policy unit test may land in **08** or **12**)
- [x] [`../STATUS.md`](../STATUS.md) → **08-codegen-policy-builtins.md**

## Out of scope

Policy engine wildcard implementation (task **08**)
Codegen run (task **08**)
DAL / API
