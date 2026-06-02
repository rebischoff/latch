# CRM — database plan (docs only)

> **⚠ Superseded pending [Phase 02b](../../../docs/phases/02b-platform-extraction/STATUS.md) (2026-06-01).** The principles below reflect the old "schema lives with the platform" model. After 02b, **`apps/crm` owns the schema, seed, store, and migrations** (`@latch/*` are domain-agnostic; `apps/web` is retired). This file is rewritten in [`02b task 05`](../../../docs/phases/02b-platform-extraction/tasks/05-retire-web.md).

CRM does not own a separate database. It uses the **same company Postgres** (or in-memory store) as the rest of Latch.

## Principles

1. **DAL is the only app path to data** — routes and Server Actions call `@latch/dal`, never Drizzle directly from UI/route code.
2. **Schema home** — *(old)* `apps/web/migrations/`. *(new, per 02b)* `apps/crm/migrations/` + `apps/crm/db/`.
3. **Tables** — *(old)* "CRM adds no tables." *(new, per 02b)* CRM **owns** `jobs`, `assignments`, `latch_users`, `customers`, `sites`; `@latch/audit` still owns `latch_audit`.

## Environments

| Environment | `DATABASE_URL` | Notes |
|-------------|----------------|-------|
| Local / preview / prod | **Neon** connection string | Same project URL in `apps/web/.env.local` and `apps/crm/.env.local` when testing audit |
| No Postgres | Omit `DATABASE_URL` | In-memory pilot store + in-memory audit (default for UI-only work) |

See [`../../../docs/foundations/development.md`](../../../docs/foundations/development.md) for Neon setup and `npm run db:migrate`.

## Migration plan

| Step | Action |
|------|--------|
| 1 | Apply `apps/web/migrations/001_init.sql` on fresh Neon DB (`npm run db:migrate` from repo root) |
| 2 | If old DB had soft-delete columns, apply `002_drop_soft_delete_columns.sql` |
| 3 | When customer Surface lands, add migration for `customers` / `sites` via phase task — not CRM-driven schema design |

**Seed data:** reuse `@latch/dal` `seedPilotJobs` (+ future customer seeds). Optional SQL seed script only if memory store is retired.

## Store selection (implementation)

```
if DATABASE_URL set
  → Postgres audit writer (existing) + Postgres DAL adapter (when built)
else
  → MemoryJobStore + seedPilotJobs (dev default, matches apps/web today)
```

CRM should not fork store logic — import shared `lib/latch.ts` factory pattern from one place (duplicate thin file in `apps/crm/lib` until shared).

## What CRM proves for DB

| Check | How |
|-------|-----|
| Reads respect row scope | Tech list ≠ admin list row count |
| Writes audit | After delete, `latch_audit` row exists when `DATABASE_URL` points at Neon |
| No tombstone columns | Deleted job absent from `jobs` table (when Postgres DAL lands) |

**Not in CRM scope:** migration authoring, partition management, restore-from-audit replay.

## Related

- [`../../../docs/reference/audit-and-lifecycle.md`](../../../docs/reference/audit-and-lifecycle.md)
- [`../../../docs/foundations/development.md`](../../../docs/foundations/development.md)
