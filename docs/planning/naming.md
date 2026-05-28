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

**Rationale:** Short, pronounceable, avoids "module" / ESM confusion, and fits the v1 story (permissions enforced and UI kept in lockstep at the DAL). `@latch/core` looked unclaimed on npm at decision time — verify domain/GitHub org before external launch.

## Decision: rename before code lands (2026-05-27)

**Choice:** Pick the final name in **Phase 0**, before `@latch/*` packages, `latch_*` migrations, or external README copy.

**Rationale:** Rename cost grows with spread; mechanical rename completed in-repo the same day as the decision.

## Constraints / wishlist (used to pick Latch)

- Short (1–2 syllables ideal).
- Pronounceable.
- npm scope available (`@latch/*`).
- Domain available (`.dev` or `.io`) — **verify before marketing**.
- Github org available — **verify before marketing**.
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
7. `STATUS.md` — Step 1 removed; Step 2 is current

**Not renamed:** local clone directory (`Sites/modula`) — rename on disk if desired.

**Local dev:** If you have an existing `.env.local` or Docker volume from the old defaults, recreate or update credentials (`postgresql://latch:latch@localhost:5432/latch`) and consider `docker compose down -v` to reset the volume name.

## Related

- [`STATUS.md`](../../STATUS.md)
- [`open-questions.md`](./open-questions.md)
