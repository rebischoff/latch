# Spike policy console — open items (index)

> **Updated:** 2026-06-09. Primary follow-up questions are split into **[discussions/](./discussions/README.md)**.

Spike UI tasks 01–04 and **07** (user create) are **complete**. Optional work below unless promoted to a task file.

---

## Discussions (start here)

| # | Topic |
|---|--------|
| [01 — User console](./discussions/01-user-console.md) | ~~User create gap~~ closed (task 07); bootstrap + self-patch reference |
| [02 — Privileged assignment](./discussions/02-privileged-assignment.md) | `system_iam` vs `system_data` granting rules + proof plan |
| [03 — IAM ownership](./discussions/03-app-iam-ownership.md) | Platform vs app — who implements user/role CRUD |

> **Repo decision (2026-06-09):** bounded **scope primitive** + **scoped delegation** locked — [discussion 09](../../../docs/discussions/09-role-delegation-and-scope.md#decision-bounded-scope-primitive--scoped-delegation-2026-06-09). Platform build tracked in [`packages/policy` task 05](../../../packages/policy/docs/tasks/05-scope-and-delegation.md); not spike work.

**Suggested order:** 08 (scoped delegation, after policy 05 Phase A) → 02 → profile write → Phase 06 cache → widgets demo (task 06).

---

## Nav bar {#nav-bar}

### Done (2026-06-09)

- **Act as** — light pill on dark header; inline “N roles” hint.

### Remaining

| Step | Question | Notes |
|------|----------|-------|
| 1.1 | Real login vs Act as cookie? | Defer to template + Auth.js |
| 1.2 | Policy version elsewhere? | Nav tag only; Phase 06 cache debug optional |
| 1.3 | Filter Act as user list? | Low priority |

---

## Roles {#roles}

Surface vs field actions, create mode, approve/submit, deny semantics — unchanged reference. See:

- [Discussion 03](./discussions/03-app-iam-ownership.md) for policy engine vs app DAL
- [`docs/reference/access-control.md`](../../../docs/reference/access-control.md)
- Role editor UI: [`tasks/03-roles-ui.md`](./tasks/03-roles-ui.md)

**Headlines:**

- Surface actions and field actions are **parallel** (`manifest.actions` vs `manifest.fields`) — not overrides
- `create` is a `PolicyScope.mode` (P7 deferred); role **create** works via `role_detail`
- Spike grants are **allow-only**; `denyWins` is engine-only (unit tests)

---

## Policy exports {#policy-exports}

Reference: **`/dev/policy-api`** (`app/dev/policy-api/page.tsx`).

| Layer | Key exports |
|-------|-------------|
| Request | `PolicyService`, `definePolicyRegistry`, `MemoryRoleGrantProvider` |
| Writes | `validateGrantTuple`, `resolveGrantSurfaceDef` |
| Merge | `unionGrants`, `mergeRowScope`, `unionSurfaceActions`, `ensureFieldKeys`, synthesis helpers |
| Not in spike UI | `CachingPolicyService` (Phase 06) |

Full table: [Discussion 03 — Policy in the app](./discussions/03-app-iam-ownership.md#latchpolicy-in-the-app-reference).

---

## Related

- [Discussions index](./discussions/README.md)
- [Tasks README](./tasks/README.md)
- [Policy package tasks](../../../packages/policy/docs/tasks/README.md)
