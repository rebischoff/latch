# 99 — test1 v1 definition of done

> **Status:** Planning stub — fill verify checklist when task bands are scheduled.

## Goal

Checklist that test1 v1 learning harness is complete — you understand Latch end-to-end including DB RBAC.

## Target criteria (draft)

- [ ] Better Auth login/logout; session never embeds roles
- [ ] `getPrincipal()` loads roles (+ `policyVersion`) from DB
- [ ] Three business Surfaces (`contact`, `project`, `task`) with list/detail modes
- [ ] Nav shows only permitted routes (`navManifestScope: minimal`)
- [ ] Field-level read/write differs by role (visible in UI + DAL)
- [ ] `latch_roles` + `latch_role_grants` persisted; `iam_master` edits via `user` / `role` pages
- [ ] `@latch/policy` resolves DB grants (task 22)
- [ ] No Tailwind; no raw `db.*` outside DAL layer
- [ ] Vitest covers policy matrix + at least one e2e path

## Reference

- [../PLAN.md](../PLAN.md)
- CRM DoD: [`apps/crm/docs/PLAN.md`](../../../crm/docs/PLAN.md)

## Prerequisites

- Task **90** complete (or parallel if audit deferred).

## Note

Expand **Verify (stop gate)** with concrete steps when implementation begins. Update [../STATUS.md](../STATUS.md) when all boxes pass.
