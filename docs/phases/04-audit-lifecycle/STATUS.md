# STATUS — Phase 04 Audit & lifecycle

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-05-30.

- **Home package:** `@latch/audit`
- **State:** partial — append-only audit + immutability triggers exist; **hard delete locked** (2026-05-30); restore-from-audit tool not built.

## Right now — do this next

Not active. Entry point when picked up: design **restore-from-audit** privileged tool + cascade documentation + DB-level immutability verification (T6).

## Blockers

- None for delete model — locked in [`decisions.md`](./decisions.md) and [`../../foundations/scope.md`](../../foundations/scope.md).

## Recently completed

- **2026-05-30:** Hard-delete-only decision + doc sweep; pilot DAL `delete` (no `deleted_at`); audit action `delete`.
- `@latch/audit` writer + `latch_audit` table; BEFORE UPDATE/DELETE immutability trigger (T6).
- DAL `writeAudit` on the pilot mutation paths.
