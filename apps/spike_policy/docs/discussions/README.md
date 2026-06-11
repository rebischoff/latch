# Spike policy console — discussions

> **Updated:** 2026-06-09. Follow-up questions from reviewing `apps/spike_policy` and `@latch/policy` after tasks 01–04.

Spike UI tasks are **complete**; items here are optional or deferred unless promoted to a task file under [`../tasks/`](../tasks).

| # | Discussion | Summary |
|---|------------|---------|
| **01** | [User console — bootstrap, create, self-patch](./01-user-console.md) | Users UX reference; user create **closed** (task 07); bootstrap self-patch |
| **02** | [Privileged assignment — `system_iam` vs `system_data`](./02-privileged-assignment.md) | Who may grant which system class; how to prove it in the spike |
| **03** | [IAM ownership — platform vs business app](./03-app-iam-ownership.md) | Who implements get/create/edit/delete for users and roles |

## Other reference (not split)

- Nav **Act as** + policy version — done (2026-06-09); minor deferrals in [open-items](../open-items.md#nav-bar)
- Surface vs field actions, approve/create modes — [open-items § Roles](../open-items.md#roles)
- `@latch/policy` export map — `/dev/policy-api` and [open-items § Policy exports](../open-items.md#policy-exports)

## Suggested execution order

1. [08 — Scoped delegation](../tasks/08-scoped-delegation.md) (after policy 05 Phase A)
2. [02 — Prove privileged assignment in UI](./02-privileged-assignment.md#steps-to-prove-in-the-spike)
3. Profile write on `user_roles_detail` (see [01](./01-user-console.md))
4. `CachingPolicyService` (Phase 06)
5. Widgets / business CRUD demo (deferred task 06)

## Related

- Task index: [`../tasks/README.md`](../tasks/README.md)
- Platform identity: [`../../../../docs/discussions/02-identity-and-permissions.md`](../../../../packages/docs/discussions/02-identity-and-permissions.md)
- Access control: [`../../../../docs/reference/access-control.md`](../../../../packages/policy/docs/access-control.md)
