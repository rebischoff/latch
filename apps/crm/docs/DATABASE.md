# CRM — database plan (docs only)

CRM does not own a separate database. It uses the **same company Postgres** (or in-memory pilot store) as the rest of Latch.

## Principles

1. **DAL is the only app path to data** — routes and Server Actions call `@latch/dal`, never Drizzle from `apps/crm`.
2. **Schema lives with the platform** — migrations under `apps/web/migrations/` (or future shared `packages/dal/migrations/`) until a dedicated migration home is chosen.
3. **CRM adds no tables** — only consumes `jobs`, `assignments`, `latch_users`, `latch_audit`, and future customer tables when Surfaces define them.

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
