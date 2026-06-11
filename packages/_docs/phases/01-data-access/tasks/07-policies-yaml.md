# 07 — `job_list.policies.yaml`

## Goal

Role → Field grants for the list Surface; row scope parity with `job_detail`.

## Prerequisites

[06-surface-yaml.md](./06-surface-yaml.md) complete.

## Files

| File | Action |
|------|--------|
| `apps/web/modules/job/job_list.policies.yaml` | **Create** |
| `packages/policy/src/surfaces/job-list.ts` | **Create or extend** — hand-synced until codegen loads policies (mirror `job-detail.ts` pattern) |

## Steps

1. Read [`../../../foundations/use-cases.md`](../../../foundations/use-cases.md) S1 (field tech list) and S2 (admin bulk).
2. Set `surface: job_list`.
3. **`field_tech`:** `rowScope: own`; `read` on `summary`, `customer_site`; **no** `read` on `financial_terms`; `read` on `assignments` (display only, not bulk-write).
4. **`office_admin`:** `rowScope: all`; `read` on all list Fields; `write` on `assignments` (bulk reassign driver); `read` on `financial_terms`; Surface actions: `read`, `write`, `delete` as needed for bulk delete.
5. Mirror deny/allow patterns from [`job_detail.policies.yaml`](../../../../../apps/web/modules/job/job_detail.policies.yaml) where S1/S2 require the same semantics.
6. Wire policy module into `PolicyService` surface registry (same pattern as `job_detail`).

## Verify (stop gate)

- [ ] YAML parses; `surface` is `job_list`
- [ ] Tech role has no `financial_terms` read grant
- [ ] Row scopes: `own` / `all` match `job_detail`
- [ ] [`../STATUS.md`](../STATUS.md) → **08-codegen.md**

## Out of scope

Codegen run, DAL list implementation.
