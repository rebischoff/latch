# 05 — `@latch/audit` skeleton

## Goal

Append-only audit **write API** (`writeAudit`, `setAuditWriter`) for DAL to call.

## Prerequisites

[04-db-schema.md](./04-db-schema.md) complete.

## Files

| File | Action |
|------|--------|
| `packages/audit/src/types.ts` | `AuditEntryInput` |
| `packages/audit/src/audit-service.ts` | `writeAudit`, `setAuditWriter`, memory writer for tests |
| `packages/audit/src/index.ts` | Exports |

## Steps

1. Read [`../../architecture/audit-and-lifecycle.md`](../../../../audit/docs/audit-and-lifecycle.md).
2. Define input: `actorId`, `action`, `tableName`, `recordId`, optional `before`/`after`, `requestId`, `approvalId`.
3. Provide injectable writer (DB writer wired in task 17).
4. No UPDATE/DELETE helpers — insert only.

## Verify (stop gate)

- [x] Memory writer captures entries in a test
- [x] `@latch/audit` does not import `@latch/dal`
- [x] `STATUS.md` → **06-surface-yaml.md**

## Out of scope

DB triggers (task **17**).
