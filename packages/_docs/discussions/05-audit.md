# Discussion 05 — Audit

> **Status:** Open (2026-06-05). Compartment 4 in the [map](../reference/compartments.md#4-audit-runtime-hook--template-tables). **Packaging opinionation** (Postgres writer, template DDL, IAM vs business stream): session 6 in [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md) → [`12-audit-opinionation.md`](./12-audit-opinionation.md).

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
4. **`latch_audit` ships for every Latch app**; **audit mode** (`full` \| `standard` \| `recovery`) is chosen at scaffold — default **`full`**. See [`12-audit-opinionation.md`](./12-audit-opinionation.md).

### Decision: audit mode (2026-06-10)

**Choice:** Supersedes point 4’s vague “seam to disable.” Modes and change policy: [`12-audit-opinionation.md` § audit mode](./12-audit-opinionation.md#decision-audit-mode-at-scaffold-2026-06-10).

## Open questions

- ~~Is audit always on vs opt-in?~~ **Resolved (2026-06-10)** — table always on; mode at scaffold ([`12`](./12-audit-opinionation.md)).
- DB triggers on business tables vs app-level `writeAudit` only — **resolved** for v1: app-path DAL writes; immutability trigger on `latch_audit` only ([`audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md)).
- Retention policy defaults — **resolved** for v1: 3-year config seam; no partition automation in CI (Phase 04 task 08).

## Related

- [`../reference/audit-and-lifecycle.md`](../../audit/docs/audit-and-lifecycle.md), [`packages/audit/src/audit-service.ts`](../../audit/src/audit-service.ts), [`packages/audit/src/restore.ts`](../../audit/src/restore.ts)
