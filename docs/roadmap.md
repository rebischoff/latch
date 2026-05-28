# Roadmap

Phased plan. Dates intentionally absent. Scope is captured in [`planning/scope.md`](./planning/scope.md); the live next-step is in [`STATUS.md`](../STATUS.md).

## Phase 0 — Scaffold & planning (current)

- [x] Next.js + TypeScript repo
- [x] `docs/` structure and architecture write-up
- [x] Local Postgres via Docker Compose
- [x] Health check endpoint
- [x] Permissions / DAL / UI sync decisions documented
- [x] v1 scope tightened ([`scope.md`](./planning/scope.md))
- [x] Threat model drafted ([`threat-model.md`](./planning/threat-model.md))
- [x] Bulk operations design ([`bulk-operations.md`](./planning/architecture/bulk-operations.md))
- [x] API style decision ([`api-style.md`](./planning/architecture/api-style.md))
- [x] Monorepo plan ([`packages.md`](./planning/architecture/packages.md))
- [x] `STATUS.md` quarterback file
- [x] `.cursor/rules/` AI guidance
- [ ] **D1** Pick final project name ? mechanical rename
- [ ] **D2** Pick auth provider
- [ ] Migrate to monorepo (Step 2 in STATUS)

## Phase 1 — Foundation (post-monorepo)

Goal: smallest stack that supports one Surface end-to-end.

- [ ] `packages/contracts` skeleton (manifest schema, Field ID types, base Zod helpers)
- [ ] `packages/policy` skeleton (`PolicyService`, `union_grants` + `denyWins`)
- [ ] `packages/codegen` skeleton (Surface YAML ? TS; `codegen --check` for CI)
- [ ] `packages/audit` skeleton (audit table migration + insert helper)
- [ ] `packages/dal` skeleton (DAL kernel with `PermissionContext`, single-record CRUD, narrowing)
- [ ] `packages/react` skeleton (`CapabilitiesProvider`, `<Can>`, `<FieldControl>`)
- [ ] DB connection in `apps/web` with per-request client (single `DATABASE_URL` v1)
- [ ] Built-in role seeds
- [ ] First test: PolicyService matrix (single mode + denyWins)

## Phase 2 — Pilot Surface (the proof)

Goal: `job_detail` works end-to-end with every concept exercised.

- [ ] `job_detail.surface.yaml` + `job_detail.policies.yaml`
- [ ] Codegen output committed
- [ ] DAL: single-record read with Field narrowing + row scope
- [ ] DAL: single-record update with `.strict()` writable Zod
- [ ] DAL: soft delete
- [ ] DAL: bulk update + bulk soft-delete with per-row eval ([`bulk-operations.md`](./planning/architecture/bulk-operations.md))
- [ ] Route handler factory: GET / PATCH / DELETE / bulk
- [ ] Server Action helper for `job_detail` form
- [ ] Audit triggers on `jobs` and friends
- [ ] Approval flow for one Field (`financials.contract_amount`)
- [ ] `job_list` and `customer_detail` follow same pattern
- [ ] Threat tests T1, T2, T3, T11, T13, T15 in CI

## Phase 3 — Sample app polish

Goal: usable internally as a trades-CRM.

- [ ] Auth wired (provider per D2)
- [ ] Login + role-aware nav
- [ ] Forms styled consistently with Tailwind
- [ ] Simple role-assignment admin Surface
- [ ] Seed data for trades-CRM scenarios
- [ ] Local dev script: clean slate to running in <60 seconds

## Phase 4 — Hardening (post-v1)

These move out of "deferred" once v1 ships. None block v1.

- [ ] RLS spike (Spike A–D in [`discovery/postgres-rls-and-security.md`](./planning/discovery/postgres-rls-and-security.md))
- [ ] Hard delete + restore
- [ ] Audit retention/partitioning automation
- [ ] Multi-company DB routing
- [ ] Additional role-merge modes (`intersection_grants`, `most_restrictive`, `priority`)
- [ ] Partial / per-Field approval
- [ ] Async bulk for >cap batches
- [ ] OpenAPI generation from route handler factory
- [ ] Extract `packages/*` to publishable repo

## Discussion backlog

Topics for ad-hoc sessions when relevant:

1. Per-Surface override of `multiRoleCombine`
2. External reviewers (customer sign-off) — design when first vertical use case appears
3. Tracking / observability story (request_id, denied access logs, metrics)
4. CI strategy (Postgres testcontainers? GitHub Actions matrix?)
5. Final naming candidates and shortlist
