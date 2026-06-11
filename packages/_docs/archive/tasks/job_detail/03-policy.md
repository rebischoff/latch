# 03 — `@latch/policy`

## Goal

`PolicyService.resolve(principal, scope) → manifest` with **`union_grants`** and **`denyWins`**.

## Prerequisites

[02-contracts.md](./02-contracts.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/policy/package.json` | Depend on `@latch/contracts` |
| `packages/policy/src/merge.ts` | `unionGrants`, `mergeRowScope` |
| `packages/policy/src/surfaces/job-detail.ts` | Role grants mirroring future policies YAML |
| `packages/policy/src/policy-service.ts` | `PolicyService` + surface registry |
| `packages/policy/src/policy-service.test.ts` | Matrix tests |
| `packages/policy/src/index.ts` | Exports |
| Root `package.json` | `"test": "vitest run"` if not present |
| `vitest.config.ts` | Include `packages/**/*.test.ts` |

## Steps

1. Read [`../../architecture/access-control.md`](../../../../policy/docs/access-control.md).
2. Implement merge: union allows across roles; explicit deny strips actions when `denyWins`.
3. Register `job_detail` policies: `field_tech` (own rows, no financial read), `office_admin` (all rows, financial read/write/approve).
4. Add tests: tech vs admin financial fields; multi-role union; deny wins on financial for tech-only.
5. Run `npm run test` for policy package.

## Verify (stop gate)

- [x] `npm run test` — policy matrix green
- [x] `field_tech` manifest: `financial_terms` actions empty
- [x] `office_admin` manifest: `financial_terms` includes `read`, `write`, `approve`
- [x] `STATUS.md` → **04-db-schema.md**

## Out of scope

DAL, YAML loader (hardcode TS matching YAML for now; task 07 aligns YAML).
