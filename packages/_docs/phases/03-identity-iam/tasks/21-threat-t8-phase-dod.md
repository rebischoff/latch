# 21 — Threat T8 + data_master test + phase DoD

> **Status:** Complete (2026-06-02). Phase 03 done — root STATUS repointed to [Phase 04 — Audit & lifecycle](../../04-audit-lifecycle/STATUS.md).

## Goal

Close threat **T8** (privilege escalation via role assignment) and prove **data_master** auto-access for a newly registered business Surface. Mark Phase 03 definition of done.

## Prerequisites

[20-e2e-identity.md](./20-e2e-identity.md) complete.

## Files

| File | Action |
|------|--------|
| `tests/threat.test.ts` | **T8** — `field_tech` PATCH IAM route → 403 + no DB change |
| `packages/policy/src/policy-service.test.ts` | **data_master** + throwaway Surface id |
| [`../README.md`](../README.md) | Check off definition-of-done items |
| [`../STATUS.md`](../STATUS.md) | Phase complete |
| [`../../../../STATUS.md`](../../../../../STATUS.md) | Repoint active phase → **04 Audit** (default) |

## Steps

1. Read [`../../../foundations/threat-model.md`](../../../foundations/threat-model.md) — **T8**.
2. **T8:** `field_tech` attempts `PATCH /api/iam/users/...` to add `iam_master` → **403** (or 404 hide); assert `latch_user_roles` unchanged; optional audit deny row.
3. **data_master regression:** in policy tests, register a synthetic business Surface with one Field → `data_master` principal receives `read`/`write` without editing `data_master` YAML.
4. **T8 positive:** `iam_master` can assign roles via API; GET reflects change.
5. Run `npm run test`, `npm run build`, `npm run codegen:check`.
6. Update phase + root STATUS per [45-phase-tasks.mdc](../../../../../.cursor/rules/45-phase-tasks.mdc).

## Verify (stop gate)

- [x] `npm run test` — threat + e2e + packages green
- [x] `npm run codegen:check` passes
- [x] `npm run build` passes
- [x] Phase README definition of done:
  - [x] `latch_user_roles` migration + seeds
  - [x] `getPrincipal` resolves roles from DB (stub fallback for CI)
  - [x] Auth provider (Auth.js) wired
  - [x] IAM admin Surface (`user_roles_detail`) assign/revoke via API, audited
  - [x] Test: new business Surface accessible to `data_master`
- [x] [`../STATUS.md`](../STATUS.md) → Phase 03 complete
- [x] Root [`../../../../STATUS.md`](../../../../../STATUS.md) repointed to Phase 04 (unless change order)

## Out of scope

CRM IAM admin UI
IdP group sync
Break-glass audit enhancements
