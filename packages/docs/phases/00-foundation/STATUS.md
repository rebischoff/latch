# STATUS — Phase 00 Foundation

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-05-29.

- **Home packages:** `@latch/contracts`, `@latch/policy`, `@latch/codegen`
- **State:** mostly done (delivered via the `job_detail` pilot)

## Right now — do this next

Nothing active. Foundation is in place. Revisit only when a later phase needs a new manifest/policy/codegen seam (record such needs in [`decisions.md`](./decisions.md)).

## Blockers

None.

## Recently completed

- Manifest types, `PolicyService` (`union_grants` + `denyWins`), codegen + `--check`.
- Single-record DAL read/write/hard-delete with Field narrowing + row scope.
- Policy matrix + DAL contract tests; threat tests T1, T2, T3, T6, T11, T13.
- Full history archived under [`../../archive/`](../../archive/).
