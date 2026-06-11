# 07 — `customer_detail.policies.yaml` + `customer_ref` on `job_detail`

> **Status:** Complete (2026-06-02). Next: [08-codegen.md](./08-codegen.md).

## Goal

Role → Field grants for `customer_detail` (admin-only) and a `customer_ref` read grant on `job_detail` for the cross-Surface link.

## Prerequisites

[06-surface-yaml.md](./06-surface-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/crm/modules/customer/customer_detail.policies.yaml` | **Create** |
| `apps/crm/modules/job/job_detail.policies.yaml` | **Extend** — `customer_ref` grant for `office_admin` |
| `apps/crm/src/lib/policy/customer-detail.ts` | **Create** — hand-synced policy module (mirror [`job-detail.ts`](../../../../apps/crm/src/lib/policy/job-detail.ts)) |
| `apps/crm/src/lib/policy/job-detail.ts` | **Extend** — add `customer_ref` to field ids + role grants |

## Steps

1. Read [`../decisions.md`](../decisions.md#decision-customer_detail-surface-sketch-2026-06-01) role matrix.
2. **`customer_detail.policies.yaml`:**
   - `surface: customer_detail`
   - `forbiddenFieldResponse: 404` (per-Surface hide for no-grant principals — tech gets 404, not 403)
   - **`office_admin` only:** `rowScope: all`; Surface actions `read`, `write`; Field grants:
     - `profile`, `billing`, `sites` → `read`, `write`
     - `job_history` → `read` only
   - **`field_tech`:** no binding (omit role entirely)
3. **`job_detail` — `customer_ref`:**
   - `office_admin`: `read` on `customer_ref`
   - `field_tech`: no grant (Field omitted from DTO; link hidden in UI)
4. Mirror YAML into TypeScript policy modules; wire into [`registry.ts`](../../../../apps/crm/src/lib/policy/registry.ts) in task **08** (this task may prepare the module; registration lands in 08 with codegen field ids).

## Verify (stop gate)

- [x] YAML parses; `surface` is `customer_detail`
- [x] `field_tech` has **no** role block on `customer_detail`
- [x] `office_admin` has `read`/`write` on `profile`, `billing`, `sites`; `read` only on `job_history`
- [x] `forbiddenFieldResponse: 404` set on `customer_detail`
- [x] `job_detail` grants `customer_ref` `read` to `office_admin` only
- [x] [`../STATUS.md`](../STATUS.md) → **08-codegen.md**

## Out of scope

Codegen run, DAL, API routes, CRM UI.
