# Phases

The delivery plan, sliced into **self-contained phases**. Each phase folder owns its own goal, scope, task list, decisions, and **`STATUS.md`** so it can be tracked — and re-sequenced — independently.

> The root [`STATUS.md`](../../STATUS.md) is the global quarterback: it names the **active phase**. Each phase's `STATUS.md` is the local quarterback for that phase.

## How phases work (read this first)

- **Sequenced, not blocking.** Phases have a recommended order, but each is self-contained. You can pause one and advance another, or work two in parallel.
- **Change orders are expected.** When priorities shift, re-point the root `STATUS.md` at a different phase, or **insert a new phase folder** (`NN-name/`). Nothing else needs rewriting.
- **Dependencies are declared, not assumed.** Each phase README has a **Depends on** section listing what it expects from earlier phases. Jumping ahead is allowed; the dependency list tells you what you're trading off.
- **Hybrid axis.** Foundation phases are package-shaped; capability phases each name a **home package** even when they touch several.

## Planning gate (stop-and-plan rule)

Applies to **all** implementation — packages **and** `apps/crm`.

> **If an implementation task reaches a point that is not already planned, stop and plan before writing code.**

A task is "planned enough" only when the decision it needs is recorded (a dated Decision, a task `tasks/NN-*.md` with a Verify gate, or an entry in the relevant `decisions.md`). When you hit an unplanned fork — a new Surface/Field, an API shape not yet defined, an auth/provider choice, a cascade rule, anything in `open-questions.md` — do this instead of guessing:

1. **Halt** the current task.
2. Record the gap: add it to the phase `decisions.md` (Open / to lock) or [`../foundations/open-questions.md`](../foundations/open-questions.md).
3. Update the relevant `STATUS.md` "Do next" to **"plan X"** rather than "build X".
4. Resume implementation only after the decision is written down.

This is cheaper than building on an imagined contract and reworking. CRM slices follow the same gate via [`../reference/crm-and-phases.md`](../reference/crm-and-phases.md) (timing rule).

## Phase map

| Phase | Home package(s) | Capability | State |
|-------|-----------------|-----------|-------|
| [`00-foundation`](./00-foundation/README.md) | `contracts`, `policy`, `codegen` | Manifest, PolicyService, YAML→TS, single-record DAL | mostly done |
| [`01-data-access`](./01-data-access/README.md) | `dal` | List, projection, bulk update/delete (`job_list`) | complete |
| [`02b-platform-extraction`](./02b-platform-extraction/README.md) | `policy`, `dal` | Genericize `@latch/*`; `apps/crm` sole consumer; retire `apps/web` | **active** |
| [`02-ui-sync`](./02-ui-sync/README.md) | `react`, `dal`, `apps/crm` | `<Can>`/`<FieldControl>`, `customer_detail` stack + CRM proof | paused (resumes after 02b) |
| [`03-identity-iam`](./03-identity-iam/README.md) | `policy` + `iam` | Users/roles in DB, IAM master + Data master, real auth | not started |
| [`04-audit-lifecycle`](./04-audit-lifecycle/README.md) | `audit` | Full audit, hard delete + recovery | partial |
| [`05-verification`](./05-verification/README.md) | `approval` | Accept/reject, field/surface verification gates | partial |
| [`06-performance-safety`](./06-performance-safety/README.md) | `policy` / `dal` | Manifest cache modes, RLS surface-gate | not started |
| [`07-scale-out`](./07-scale-out/README.md) | cross-cutting | Multi-company routing, package publishing | deferred |

## Phase folder layout

```
phases/<NN>-<name>/
  README.md      # goal, depends-on, in/out scope, sub-goals, definition of done
  STATUS.md      # phase-local quarterback (state, next step, blockers)
  decisions.md   # phase-scoped decisions (incl. deferred items from planning chats)
  tasks/         # NN-*.md executable task files (with Verify stop-gates)
```

## Related

- [`../../STATUS.md`](../../STATUS.md) — global quarterback (active phase)
- [`../foundations/scope.md`](../foundations/scope.md) — v1 in/out
- [`../foundations/architecture-overview.md`](../foundations/architecture-overview.md) — system shape
- [`../reference/packages.md`](../reference/packages.md) — package boundaries
