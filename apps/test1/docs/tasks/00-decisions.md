# 00 — Lock test1 decisions

> **Status:** Complete (2026-06-03). Next: [01-task-index.md](./01-task-index.md) (read once), then schedule [02-monorepo-entry.md](./02-monorepo-entry.md).

## Goal

Record auth provider, Surface+mode model, DB RBAC target, stack, and scope override so tasks **02+** do not re-debate them. **Docs only — do not add application code.**

## Prerequisites

- Skim [../PLAN.md](../PLAN.md) and [../decisions.md](../decisions.md).

## Files (docs only)

| File | Action |
|------|--------|
| [../decisions.md](../decisions.md) | Decision blocks present (Better Auth, RBAC split, Surface model, DB grants target, system roles, scope override) |
| [../AUTH.md](../AUTH.md) | Better Auth seam + no org/role plugins for Latch authz |
| [../DATABASE.md](../DATABASE.md) | Table sketch including `latch_roles`, `latch_role_grants` |
| [../STATUS.md](../STATUS.md) | After verify: **Execute now** → `01-task-index.md` (read), then `02-monorepo-entry` when ready |

## Decisions to lock (in [../decisions.md](../decisions.md))

1. **Latch auth agnostic** — `@latch/*` has no auth imports; app implements `getPrincipal()` → `Principal`.
2. **Better Auth for test1** — not Auth.js; session = user id only.
3. **No Better Auth role/org plugins** for authorization.
4. **Surface ids** — `contact`, `project`, `task`, `user`, `role`; list/detail = `mode`, not separate policy surfaces.
5. **Phased policy** — YAML first (tasks 10–12); Postgres grants (tasks 20–23).
6. **System roles** — `iam_master`, `data_master` seeded, non-deletable.
7. **Stack** — Next 16, AntD, RHF, Neon, `@latch/*`.
8. **Scope override** — second consumer app for learning.

## Verify (stop gate)

- [x] Decision blocks exist in [../decisions.md](../decisions.md) for all items above
- [x] [../AUTH.md](../AUTH.md) documents Better Auth vs Latch boundary
- [x] [../PLAN.md](../PLAN.md) lists 5 Surfaces and phased delivery
- [x] [../STATUS.md](../STATUS.md) points at this task then `01-task-index`
- [x] No `.ts`/`.tsx` under `apps/test1/src` (placeholders only)

## Out of scope

- Monorepo wiring, Better Auth install, migrations (tasks **02+**)
- Changes to `packages/*` or root `STATUS.md`
