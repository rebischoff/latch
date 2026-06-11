# STATUS — Phase 00 Foundation

> Phase-local quarterback. Global pointer: [`STATUS.md`](../../../../STATUS.md).
> Updated: 2026-06-10 (policy task 05 closed).

- **Home packages:** `@latch/contracts`, `@latch/policy`, `@latch/codegen`
- **State:** **complete** for the 2026-06-09 scope decision — `@latch/policy` runtime roles + scoped RLS closed in [Phase 08 task 05](../08-scoped-access/tasks/05-platform-regression.md)

## Right now — do this next

None for foundation packages. Phase sign-off: [Phase 08 DoD](../08-scoped-access/tasks/21-phase-dod.md).

## Blockers

None.

## Recently completed

- Manifest types, `PolicyService` (`union_grants` + `denyWins`), codegen + `--check`.
- Single-record DAL read/write/hard-delete with Field narrowing + row scope.
- Policy matrix + DAL contract tests; threat tests T1, T2, T3, T6, T11, T13.
- Full history archived under [`../../archive/`](../../../../../docs/archive).
