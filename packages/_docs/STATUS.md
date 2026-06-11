# STATUS — per-package board

> Per-package quarterback. The **global** quarterback (active phase) is the root [`STATUS.md`](../../STATUS.md). Detailed matrix: [`reference/platform-status.md`](./reference/platform-status.md).
> Updated: 2026-06-10.

## At a glance

| Package | State | Active task | Docs |
|---------|-------|-------------|------|
| `@latch/contracts` | v1 complete; scope seam landed | — | (no package docs) |
| `@latch/policy` | v1 complete; **scoped RLS Phase B open** | [05b — resolve `scopeIds`](../policy/docs/tasks/05b-scoped-rls-resolve.md) | [tasks](../policy/docs/tasks/README.md) · [access-control](../policy/docs/access-control.md) |
| `@latch/dal` | v1 complete; **scope filter pending** | [01 — scoped row filter](../dal/docs/tasks/01-scoped-row-filter.md) | [tasks](../dal/docs/tasks/README.md) · [bulk-operations](../dal/docs/bulk-operations.md) |
| `@latch/codegen` | tasks 01–04 complete | — (DDL gen deferred) | [docs](../codegen/docs/README.md) · [tasks](../codegen/docs/tasks/README.md) |
| `@latch/audit` | Phase 04 complete | — (biz triggers → Phase 07) | [audit-and-lifecycle](../audit/docs/audit-and-lifecycle.md) |
| `@latch/approval` | Phase 05 complete | — | [approval-trails](../approval/docs/approval-trails.md) |
| `@latch/react` | Phase 02 complete | — | (no package docs) |

## Right now — do this next

**Phase 08 Scoped access** ([phase STATUS](./phases/08-scoped-access/STATUS.md)) is the active cross-package work:

1. **`@latch/policy`** → [05b — resolve `scopeIds`](../policy/docs/tasks/05b-scoped-rls-resolve.md)
2. **`@latch/dal`** → [01 — scoped row filter](../dal/docs/tasks/01-scoped-row-filter.md)
3. **`apps/crm`** → [scoped proof](./phases/08-scoped-access/tasks/04-crm-scoped-proof.md)
4. **`@latch/policy`** → [05c — closeout](../policy/docs/tasks/05c-policy-closeout.md)

## Deferred (Phase 07, no active task)

Multi-company routing · native Postgres RLS · Postgres job store · business-table audit triggers · `@latch/*` publish · extra `multiRoleCombine` modes. See [`phases/07-scale-out/`](./phases/07-scale-out/README.md).

## Conventions

- Per-package task chains follow [`.cursor/rules/45-phase-tasks.mdc`](../../.cursor/rules/45-phase-tasks.mdc): Status line + verify gates + STATUS update on completion.
- Apps/spikes keep their own docs ([`apps/spike_policy/docs`](../../apps/spike_policy/docs/tasks/README.md)) independent of packages.
