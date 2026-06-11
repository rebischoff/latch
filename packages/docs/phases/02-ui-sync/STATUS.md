# STATUS — Phase 02 UI sync

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-06-02.

- **Home packages:** `@latch/react`, `@latch/dal`, `apps/crm` (proof harness)
- **State:** **complete** — `customer_detail` Surface shipped end-to-end; threat T14 + customer T2 in CI.

## Right now — do this next

Phase 02 is complete. Global pointer repointed to **[Phase 03 — Identity & IAM](../03-identity-iam/STATUS.md)**.

## Blockers

None.

## Recently completed

- Task **21** — Threat snapshots: T14 nav/manifest per role; customer T2 DTO omission + 404-hide; T4 response semantics; phase DoD checked off (2026-06-02).
- Task **20** — DAL-level e2e `tests/customer-detail.e2e.test.ts` (admin get/patch, tech 404-hide, T2 omission, strict patch, `customer_ref` on `job_detail`); `createCustomersDal` in test-utils (2026-06-02).
- Task **18** — Customers nav entry when `customer_detail` `read`; `PolicyService` uses `jobPolicyRegistry`; `mode: "detail"` for customers, `list` for jobs; tech Jobs-only (2026-06-02).
- Task **17** — Job detail `customer_ref` Card + link to `/customers?id=`; gated on DTO + `customer_detail` surface `read`; tech omits section (2026-06-02).
- Task **16** — CRM `/customers` split shell; `CustomerDetailPane` (profile, billing, sites, read-only `job_history`); `saveCustomerDetail` Server Action; tech → `notFound()` (2026-06-02).
- Task **13** — REST `GET`/`PATCH` `/api/customers/[id]`; `customer-handler` error mapper; 404-hide for tech; webpack `@latch/*` aliases (2026-06-02).
- Task **12** — DAL contract tests (`customer_detail` get/patch, strict patch, `job_history` read-only, `customer_ref` on `job_detail`); `npm run test` green (2026-06-02).
- Task **10** — DAL `patch` for `customer_detail` (`applyCustomerPatch`, `applySitesPatch`, strict Zod, audit on mutate); repository tests green (2026-06-02).
- Task **09** — DAL `get` for `customer_detail` (`projectCustomerRow`, `createCustomersDal`, `listJobsByCustomerId`, 404-hide for tech); contract tests green (2026-06-02).
- Task **08** — codegen for `customer_detail` + `customer_ref`; policy registry registration; `codegen:check` green (2026-06-02).
- Task **06** — `customer_detail.surface.yaml` + `customer_ref` on `job_detail` (2026-06-02).
- Task **04** — `customers`, `sites`, `jobs.customer_id`; Drizzle schema, migration `003`, seed + memory store (2026-06-02).
- Phase **02b** platform extraction — `@latch/*` genericized; jobs domain in `apps/crm`; parity verified (2026-06-02).
- Task **00** — Phase 02 decisions locked (`customer_detail` sketch, admin-only roles, cross-link `customer_ref`, no `customer_list`, 404-hide for tech, `apps/crm` canonical). Verify gate passed (2026-06-01).
