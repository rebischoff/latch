# Naming

## Status

- **Product name:** **Latch**
- **Package scope:** `@latch/*`
- **DB schema / table prefix:** `latch_*` (e.g. `latch_audit`, `latch_pending_changes`)
- **Env vars:** `LATCH_*` when a platform-specific prefix is needed
- **npm root package:** `latch` (app until monorepo workspaces land)

Former in-repo codename **Modula** was retired 2026-05-27.

## Decision: final project name (2026-05-27)

**Choice:** **Latch**

**Rationale:** Short, pronounceable, avoids "module" / ESM confusion, and fits the v1 story (permissions enforced and UI kept in lockstep at the DAL). `@latch/core` looked unclaimed on npm at decision time ù verify domain/GitHub org before external launch.

## Decision: rename before code lands (2026-05-27)

**Choice:** Pick the final name in **Phase 0**, before `@latch/*` packages, `latch_*` migrations, or external README copy.

**Rationale:** Rename cost grows with spread; mechanical rename completed in-repo the same day as the decision.

## Constraints / wishlist (used to pick Latch)

- Short (1ù2 syllables ideal).
- Pronounceable.
- npm scope available (`@latch/*`).
- Domain available (`.dev` or `.io`) ù **verify before marketing**.
- Github org available ù **verify before marketing**.
- Not already a major software project (search npm, github, google).
- Doesn't strongly imply one vertical (generic platform; trades pilot only).
- Doesn't clash with "module" / ESM concepts.

## Candidates (historical)

| Name | Outcome |
|---|---|
| Modula | Retired codename; clashed with "module" |
| Latch | **Chosen** |

## Rename mechanics (completed 2026-05-27)

Mechanical sweep applied across the repo:

1. `package.json` `name` ? `latch`
2. `modula` ? `latch` in identifiers (case-sensitive)
3. `Modula` ? `Latch` in docs
4. `modula_*` ? `latch_*` in docs and planned schema names
5. `MODULA_*` ? `LATCH_*` in env examples
6. `.cursor/rules/20-naming.mdc` updated
7. `STATUS.md` ù Step 1 removed; Step 2 is current

**Not renamed:** local clone directory (`Sites/modula`) ù rename on disk if desired.

**Local dev:** Use a Neon connection string in `apps/web/.env.local` (see [`development.md`](./development.md)). If you still use optional Docker Postgres, credentials default to `postgresql://latch:latch@localhost:5432/latch`.

## Decision: platform anchor PKs are UUID (2026-06-08)

**Choice:** Template platform tables and per-app **business anchor** rows use **`UUID` primary keys**, **DB-generated** by default (`gen_random_uuid()`). The client picks a UUID only when it needs the id up front (related-data inserts, optimistic-UI new records). Singleton seeds (e.g. `latch_roles` system rows) are identified by a **stable column** (`role_class` + partial unique index), not a hard-coded id. Natural business identifiers (SKU, email, code) are **`UNIQUE` columns**, not PKs.

**Postgres schema:** Stay on **`public`** + `latch_*` table prefix ù no separate PG `SCHEMA` for platform tables in v1.

**`latch_roles` catalog** ([P11](../../policy/docs/tasks/00-decisions-needed.md#p11--role-catalog-shape-uuid--role_class-2026-06-08)):

| Column | Convention |
|--------|------------|
| `id` | `UUID` PK |
| `role_class` | `system_data` \| `system_iam` \| `app` |
| `display_name` | Human label (not unique) |

No `slug` on catalog rows. No row `created_at` on `latch_roles` ù IAM mutation times live in `latch_audit`.

**`RoleId` in `@latch/contracts`:** UUID string (catalog `latch_roles.id`). Distinct from Surface/Field ids (`snake_case` vocabulary).

**Rationale:** Uniform surrogate keys across platform and business data; role catalog does not mint string slugs at create time; audit is the time axis for IAM mutations.

## Related

- [`STATUS.md`](../../../STATUS.md)
- [`open-questions.md`](./open-questions.md)
- [`../reference/access-control.md`](../../policy/docs/access-control.md)
