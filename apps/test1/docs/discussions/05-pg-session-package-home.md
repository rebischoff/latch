# Discussion — `@latch/pg-session` package home (deferred)

> **Status:** Decision recorded in repo docs (2026-06-04). **No package extraction yet.**

## Problem

`withPermissionDb` and `bindPermissionSession` live in [`packages/audit/src/permission-db.ts`](../../../../packages/audit/src/permission-db.ts) but are **not audit-specific** — they wrap any Postgres work in `BEGIN` + `SET LOCAL app.principal_id` / `app.company_id` (T12).

Consumers today:

| Consumer | Use |
|----------|-----|
| `@latch/audit` (CRM postgres writer) | Audit `INSERT` |
| `@latch/approval` | Pending queue |
| CRM `policy-version.ts` | Read/bump `latch_policy_version` |
| `apps/test1` IAM | `loadRolesForUser`, `resolveLatchUserId` |

Importing these from `@latch/audit` for IAM reads is confusing.

## Why not `@latch/dal`?

```
@latch/dal → imports @latch/audit
@latch/audit → must NOT import @latch/dal
```

Putting session binding only in `dal` would require `audit` → `dal` for `createPostgresAuditWriter` → **circular**.

## Locked decision (repo)

**Defer** until triggers in [`docs/reference/packages.md`](../../../../docs/reference/packages.md#decision-extract-latchpg-session-when-postgres-surface-grows-2026-06-04):

1. Postgres-backed **business** store adapters in a second app (test1 task 10+), or  
2. Phase 07 RLS needs a clear session-var home, or  
3. Planned import sweep + repeated confusion.

**Target package:** `@latch/pg-session` (preferred) or `@latch/db` if shared pool helpers ship together.

**Unchanged:** `@latch/policy` stays **no `pg`** — registry resolution only.

## Extraction checklist (when triggered)

1. `packages/pg-session/` — `package.json`, `permission-db.ts` moved from audit.
2. Update boundaries in `packages.md` + ESLint `no-restricted-imports`.
3. `@latch/audit` re-exports deprecated alias for one release cycle.
4. Sweep: CRM, test1, `@latch/approval`, threat tests.
5. `permission-db.test.ts` moves with the module.

## Related

- [packages.md — Decision](../../../../docs/reference/packages.md#decision-extract-latchpg-session-when-postgres-surface-grows-2026-06-04)
- [Phase 06 T12](../../../../docs/phases/06-performance-safety/decisions.md#decision-db-session-vars--t12-2026-06-03)
- [01-identity-two-user-stores.md](./01-identity-two-user-stores.md) · [02-policy-roles-and-resolution.md](./02-policy-roles-and-resolution.md)
