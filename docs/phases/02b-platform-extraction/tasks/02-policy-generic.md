# 02 — Generic `@latch/policy` (metadata-driven)

## Goal

Remove domain knowledge from `@latch/policy`. The package keeps its **merge/resolve semantics** (`union_grants`, `denyWins`, mode overlays) but learns surface definitions from **injected metadata**, not hardcoded `surfaces/job-*.ts`. **Additive in this task** — keep the existing pilot path working; the hardcoded surfaces are deleted in task `04`.

## Prerequisites

- [`00-decisions.md`](./00-decisions.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/policy/src/policy-service.ts` | Accept an injected surface/policy **registry** (by `surfaceId`) instead of importing `surfaces/*` |
| `packages/policy/src/registry.ts` (new) | Types for the policy registry: role → `surfaceActions`, field grants, `rowScope`, mode overlays |
| `packages/policy/src/index.ts` | Export registry types + loader; stop exporting `jobDetailPolicies` / `jobListPolicies` (kept temporarily behind a shim until `04`) |
| `packages/policy/src/policy-service.test.ts` | Add domain-free tests driven by a fixture registry (keep job-based tests until `04` moves them) |

## Steps

1. **Lock the registry shape** (decisions.md open item): define `SurfacePolicy` / `PolicyRegistry` types in `@latch/policy` (or shared in `@latch/contracts` if `react`/`codegen` also need them).
2. Refactor `PolicyService` to resolve against an injected registry; preserve `resolve(principal, scope)` signature, `union_grants`, `denyWins`, and `mode` overlay rules exactly.
3. Provide a thin **compat shim** so the current job surfaces still resolve during 02/03 (real data moves to `apps/crm` in `04`).
4. Add fixture-registry unit tests proving merge semantics with **non-domain** surface ids (e.g. `alpha`, `beta`).
5. Decide and note: does `@latch/codegen` emit a policy registry from `*.policies.yaml`, or does the app assemble it at runtime? (Lock here.)

### Decision: policy registry assembly (2026-06-02)

**Choice:** Consumer app assembles `PolicyRegistry` at runtime; codegen emits structure only (field ids, schemas), not policy bindings.

**Rationale:** See [`../decisions.md`](../decisions.md#decision-policy-registry-assembly-2026-06-02).

## Verify (stop gate)

- [x] `PolicyService` has no import of `surfaces/job-*`; resolves from an injected registry
- [x] Merge semantics unchanged (existing policy tests still pass via the shim)
- [x] New fixture-registry tests use non-domain surface ids
- [x] `npm run test` green; `npm run build` green
- [x] `../STATUS.md` **Execute now** → `03-dal-generic.md`

## Out of scope

- Deleting `surfaces/job-*.ts` (task `04`).
- DAL changes (task `03`).
- Authoring `customer_detail` policy (Phase 02).
