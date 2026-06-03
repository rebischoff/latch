# 06 — Verify parity; close phase

## Goal

Prove the genericized stack behaves exactly as the Phase 01 jobs pilot did, then hand control back to Phase 02.

## Prerequisites

- [`05-retire-web.md`](./05-retire-web.md) complete.

## Steps

1. **Automated:** `npm run test`, `npm run build`, `npm run codegen:check` all green.
2. **Boundary:** grep confirms `packages/**` has no jobs/customers identifiers and no `apps/**` imports.
3. **Manual jobs proof in `apps/crm`** (the parity acceptance):
   - Field tech: list shows only owned job; `financial_terms` omitted; forbidden detail → 404.
   - Office admin: both jobs; `financial_terms` present; patch + delete write audit.
4. Confirm `tests/threat.test.ts` (T2/T15) still passes against the relocated domain.

## Verify (stop gate)

- [x] Test / build / codegen:check green
- [x] Boundary grep clean (no domain in packages; no `apps/**` imports in packages)
- [x] Two-role jobs proof matches pre-refactor behavior
- [x] Phase 02b **Definition of done** ([`../README.md`](../README.md)) fully checked
- [x] Repoint root [`../../../STATUS.md`](../../../STATUS.md) active phase → **02 UI sync**; Phase 02 STATUS **Execute now** → `04-db-schema.md` (now targeting `apps/crm`)

## Out of scope

- `customer_detail` build (resumes in Phase 02).
