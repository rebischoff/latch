# 03 — Generic `@latch/dal` kernel

## Goal

Replace the bespoke `createJobsDal` with a **domain-agnostic** repository kernel driven by a consumer-supplied **Surface descriptor** and a **Store adapter**. The kernel keeps every invariant proven on jobs (manifest projection, strict writable narrowing, forbidden-field omission, re-auth, audit, pending/approval). **Additive in this task** — `jobs/*` stays until task `04` wires the `apps/crm` replacement.

## Prerequisites

- [`00-decisions.md`](./00-decisions.md) and [`02-policy-generic.md`](./02-policy-generic.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/dal/src/surface-descriptor.ts` (new) | Field id → column map, anchor table, readable/writable rules, row-scope predicate hooks, per-field write hooks (e.g. → pending) |
| `packages/dal/src/store-adapter.ts` (new) | `Store` interface: `get` / `list` / `upsert` / `delete` / row-scope checks / related-rows fetch |
| `packages/dal/src/create-surface-dal.ts` (new) | `createSurfaceDal(descriptor, store, deps)` → `get`/`list`/`patch`/`bulkUpdate`/`bulkDelete`/`delete` |
| `packages/dal/src/project.ts`, `narrow`, `apply-patch`, `bulk` | Generalize to operate on a descriptor instead of `MemoryJobRecord` |
| `packages/dal/src/index.ts` | Export kernel + types; keep `createJobsDal` re-export shim until `04` |
| `packages/dal/src/*.test.ts` (new) | Kernel tests with a **fixture descriptor** (non-domain surface) covering projection, strict reject, omission, bulk partial-success, delete+audit |

## Steps

1. **Lock the descriptor + Store interfaces** (decisions.md open item). Capture jobs' needs as the proving case: nested Field→multi-column (`customer_site`), `own` row scope via assignments, `financial_terms` → pending hook.
2. Port `projectJobRow` / `projectJobListRow` / `applyJobPatch` / `bulk` logic to descriptor-driven generic functions.
3. Implement `createSurfaceDal`; ensure parity with current `createJobsDal` behavior (same errors: `NotFound`, `Forbidden`, `Validation`; same audit payloads; same pending submit/accept flow).
4. Decide whether the in-memory store stays generic in `@latch/dal` (descriptor-keyed) or moves to `apps/crm` (lock here; default: generic descriptor-keyed memory store in `@latch/dal`, jobs **data** in `apps/crm`).
5. Add fixture-descriptor kernel tests; keep job tests passing via shim.

## Verify (stop gate)

- [ ] `createSurfaceDal` exists and passes fixture-descriptor tests for all six methods
- [ ] Behavior parity: existing job DAL tests still pass through the shim
- [ ] No new domain identifiers added to the kernel (`jobs`/`customers` only in the temporary shim)
- [ ] `npm run test` green; `npm run build` green
- [ ] `../STATUS.md` **Execute now** → `04-relocate-domain.md`

## Out of scope

- Deleting `jobs/*` / `schema.ts` / `seed.ts` (task `04`).
- Postgres store adapter (future; interface only here).
- `customer_detail` descriptor (Phase 02).
