# 21 — Threat snapshots (T14 + customer T2) + phase DoD

> **Status:** Complete (2026-06-02). Phase 02 complete — next: [Phase 03 Identity & IAM](../../03-identity-iam/STATUS.md).

## Goal

Extend CI threat coverage for nav/manifest leakage (**T14**) and customer DTO forbidden-field omission (**T2**). Mark Phase 02 definition of done.

## Prerequisites

[20-e2e-customer-detail.md](./20-e2e-customer-detail.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | T14 nav/manifest per role; T2 customer DTO keys |
| [`../README.md`](../README.md) | Check off definition-of-done items |
| [`.github/workflows/ci.yml`](../../../../../.github/workflows/ci.yml) | Confirm `codegen:check`, `test`, `build` |

## Steps

1. Read [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) — T14, T2.
2. **T14:** snapshot or assert nav resolve output per role — tech manifest/nav must not expose `customer_detail` Surface id or route when no grant.
3. **T2 (customer):** tech `get` / API path — 404 or absent DTO; admin DTO field sets match grants.
4. **T4 (optional):** confirm `customer_detail` 404-hide vs jobs 403 default where configured.
5. Run full `npm run test`, `npm run build`, `npm run codegen:check`.
6. Update [`../STATUS.md`](../STATUS.md) — phase complete; root [`../../../STATUS.md`](../../../../../docs/STATUS.md) → next phase (default **03 Identity** unless change order).

## Verify (stop gate)

- [x] `npm run test` — threat + e2e + packages green
- [x] `npm run codegen:check` passes
- [x] `npm run build` passes
- [x] Phase README definition of done items satisfied:
  - [x] `@latch/react` consumed on `customer_detail` CRM page
  - [x] `customer_detail` YAML + policies + page shipped
  - [x] Cross-Surface link manifest-gated
  - [x] T14 + customer T2 assertions in CI
- [x] [`../STATUS.md`](../STATUS.md) → Phase 02 complete; root STATUS repointed

## Out of scope

Full threat matrix for Phase 03+ surfaces, Playwright, `customer_list`.
