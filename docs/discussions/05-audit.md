# Discussion 05 — Audit

> **Status:** Open (2026-06-05). Compartment 4 in the [map](../reference/compartments.md#4-audit-runtime-hook--template-tables).

## Shared understanding

- Audit has two parts: a **platform table** (`latch_audit`) and a **runtime hook** (writing happens inside the DAL on each mutation).
- `latch_audit` is **append-only**, enforced by a DB trigger (`latch_audit_deny_mutation`); app code cannot UPDATE/DELETE audit rows.
- The table shape is **identical for every app** — a textbook template table.
- **Hard delete** writes a full `before` snapshot; **restore-from-audit** replays it (resurrect deleted data). There is no soft delete / `deleted_at`.
- Audit depends on runtime (it's written during DAL mutations) but the table + restore logic can be tested fairly independently (memory writer; one PG trigger test).

## Points to confirm

1. `latch_audit` (+ immutability trigger) is a **platform/template table**, the same for every app that needs auditing.
2. Audit is **written at runtime by the DAL**, not by app code scattered around.
3. The "resurrect deleted data" use case is satisfied by **hard delete + `before` snapshot + restore replay**.
4. Auditing should be **on by default** in the template for apps that opt in, with a clear seam to disable.

## Open questions

- Is audit **always on** for every business app, or opt-in per app/surface?
- DB triggers (defense-in-depth, catches raw-SQL bypass) vs app-level `writeAudit` only — which does the template ship?
- Retention policy defaults (none today) — needed for our apps?

## Related

- [`../reference/audit-and-lifecycle.md`](../reference/audit-and-lifecycle.md), [`packages/audit/src/audit-service.ts`](../../packages/audit/src/audit-service.ts), [`packages/audit/src/restore.ts`](../../packages/audit/src/restore.ts)
