# 05 — Platform regression + policy task 05 closeout

> **Status:** Complete (2026-06-10). Next: [21 — Phase DoD](./21-phase-dod.md). Package detail: [`05c-policy-closeout`](../../../../policy/docs/tasks/05c-policy-closeout.md).

## Goal

Close remaining verify gates on [policy task 05](../../../../policy/docs/tasks/05-scope-and-delegation.md) and mark `@latch/policy` runtime-roles work **complete**.

## Deliverables

### System-class unscoped regression

- Assignment validation rejects `scope_id` on `system_iam` / `system_data` bindings (spike + CRM IAM path if shared).
- `getPrincipal` never emits scoped bindings for system classes.

### Policy package tests

- `resolve` + `scopeIds` matrix (if not fully covered in task 02).
- Manifest cache: cache key unchanged; scoped manifest caches per `policyVersion` (regression in `manifest-cache.test.ts`).

### Documentation

- Mark policy task 05 **Complete**; tick all verify `- [x]`.
- Update [`packages/policy/docs/tasks/README.md`](../../../../policy/docs/tasks/README.md) — runtime roles chain complete.
- Update [`docs/phases/00-foundation/STATUS.md`](../../00-foundation/STATUS.md) — foundation + policy complete for v1 scope decision.

## Verify (stop gate)

- [x] System classes remain unscoped (`scope_id = NULL`) end-to-end
- [x] Tests: scoped list visibility, scoped delegation fence (spike), system-class-unscoped regression
- [x] Policy task 05 all verify gates `[x]`
- [x] [`packages/policy/docs/tasks/README.md`](../../../../policy/docs/tasks/README.md) shows task 05 **complete**
