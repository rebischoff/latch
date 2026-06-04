---
name: test1 scaffold docs
overview: "Create `apps/test1` as a docs-first learning harness: planning documents, a phased task folder with executable instructions (scaffold/decisions only), and a `.cursor/plans` entry. Better Auth replaces Auth.js for test1; `@latch/*` stays auth-agnostic via `getPrincipal()`. No application code in this deliverable."
todos:
  - id: dirs
    content: Create apps/test1/ directory tree (docs/, docs/tasks/, empty modules/migrations/db/src placeholders)
    status: completed
  - id: core-docs
    content: Write apps/test1/README.md + docs/PLAN.md, decisions.md, STATUS.md, STACK.md, LAYOUT.md, CONFIG.md
    status: completed
  - id: auth-db-docs
    content: Write docs/AUTH.md (Better Auth + Latch seam) and docs/DATABASE.md (Neon + table sketch)
    status: completed
  - id: task-00-01
    content: Write tasks/00-decisions.md and tasks/01-task-index.md with full roadmap diagram
    status: completed
  - id: task-scaffold-band
    content: Write executable task docs 02–05 (monorepo entry, app shell, Better Auth, Neon skeleton) — instructions only
    status: completed
  - id: task-stubs
    content: Write planning stubs for tasks 10+ and 99-phase-dod.md (titles/deliverables, no verify gates)
    status: completed
  - id: cursor-plan
    content: Write .cursor/plans/test1-scaffold-docs.plan.md mirroring this plan
    status: completed
isProject: false
---

# test1 — scaffold and planning docs (no code)

**Delivered 2026-06-03.** Docs and task chain live under [`apps/test1/`](../../apps/test1/).

## What was created

- [`apps/test1/README.md`](../../apps/test1/README.md) — entry pointer
- [`apps/test1/docs/`](../../apps/test1/docs/) — PLAN, STATUS, decisions, AUTH, DATABASE, STACK, LAYOUT, CONFIG
- [`apps/test1/docs/tasks/`](../../apps/test1/docs/tasks/) — 00–05 executable, 10–23 + 90 + 99 stubs
- Placeholder dirs: `modules/`, `migrations/`, `db/`, `src/` (README only, no TS)

## Auth boundary

- **Better Auth** for test1 ([`AUTH.md`](../../apps/test1/docs/AUTH.md))
- **Auth.js** remains CRM-only
- `@latch/*` auth-agnostic — app supplies [`Principal`](../../packages/contracts/src/types.ts) via `getPrincipal()`

## Next step

Read [`apps/test1/docs/tasks/01-task-index.md`](../../apps/test1/docs/tasks/01-task-index.md), then schedule [`02-monorepo-entry.md`](../../apps/test1/docs/tasks/02-monorepo-entry.md) when ready for code.

## Verify gate (this deliverable)

- [x] `apps/test1/docs/STATUS.md` points at `00-decisions.md`
- [x] Better Auth documented; Auth.js explicitly CRM-only
- [x] Latch auth agnosticism documented with `Principal` contract
- [x] Surface list + mode model documented
- [x] DB RBAC vision documented with YAML-first learning phase
- [x] Task index lists full roadmap; code tasks marked not scheduled
- [x] No `.ts`/`.tsx` implementation files
- [x] Root `STATUS.md` unchanged
