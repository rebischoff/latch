# STATUS — per-package board

> Per-package quarterback. The **global** quarterback (active phase) is the root [`STATUS.md`](../../STATUS.md). Detailed matrix: [`reference/platform-status.md`](./reference/platform-status.md).
> Updated: 2026-06-11.

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

**Phase 09 Platform packaging** ([phase STATUS](./phases/09-platform-packaging/STATUS.md)) — planned, ready to implement:

1. Lock [decisions](./phases/09-platform-packaging/decisions.md) open items for task 00
2. [00 — clean slate](./phases/09-platform-packaging/tasks/00-clean-slate.md) (remove `apps/`, repoint tooling to template)

## Deferred (Phase 07, no active task)

Multi-company routing · native Postgres RLS · Postgres job store · business-table audit triggers · `@latch/*` publish · extra `multiRoleCombine` modes. See [`phases/07-scale-out/`](./phases/07-scale-out/README.md).

## Conventions

- Per-package task chains follow [`.cursor/rules/45-phase-tasks.mdc`](../../.cursor/rules/45-phase-tasks.mdc): Status line + verify gates + STATUS update on completion.
- Apps/spikes keep their own docs ([`apps/spike_policy/docs`](../../apps/spike_policy/docs/tasks/README.md)) independent of packages.
