# Packages (monorepo layout)

How the codebase is partitioned. The repo is a **monorepo from day one** so package boundaries are visible and enforceable, even while everything sits in one workspace.

## Decision: monorepo from start (2026-05-27)

**Choice:** Use a workspace-based monorepo (`apps/*` + `packages/*`) immediately. Even with only one app and partially-empty packages, the boundary discipline is the value.

**Rationale:**

- Import boundaries between layers (`react` ? `dal`, `dal` ? UI) are the easiest things to violate and the hardest to refactor later.
- Future publishing of `@<project>/*` packages is a goal ? start with the right shape.
- Solo dev: a monorepo costs almost nothing if we use simple workspaces (no Nx/Turbo required initially).

## Tooling

| Concern | Choice | Notes |
|---|---|---|
| Package manager | **npm workspaces** | Already in use; zero adoption cost. Move to pnpm only if hoisting issues arise. |
| Task runner | **npm scripts** initially | Add Turborepo or Nx only when build times demand it. |
| TS project refs | **Yes** | One `tsconfig.base.json` + per-package `tsconfig.json` with `references`. |
| Lint | Shared `eslint.config.mjs` at root; per-package overrides | |
| Test | Single test runner across packages (Vitest TBD) | |

## Target layout

```
<project>/
??? STATUS.md
??? README.md
??? AGENTS.md
??? CLAUDE.md
??? .cursor/
?   ??? rules/*.mdc
??? docs/                          # Planning, architecture, discovery
??? docker-compose.yml             # Optional local Postgres (Neon is default)
??? package.json                   # Root: workspaces + dev scripts
??? tsconfig.base.json
??? apps/
?   ??? crm/                       # Sole app + Latch proof harness (Ant Design, no Tailwind)
?       ??? src/app/               # App Router
?       ??? src/lib/               # latch.ts: assembles Surface descriptors + policy registry
?       ??? db/                    # Owns Drizzle schema + seed + store
?       ??? modules/               # Surface YAML + generated/ per Surface
?       ??? migrations/            # Owns SQL migrations
?       ??? package.json
?       ??? ...
??? packages/
    ??? contracts/                 # Manifest schema, Field IDs, base Zod (client-safe)
    ??? policy/                    # PolicyService + metadata-driven registry loader (server)
    ??? dal/                       # Generic DAL kernel (createSurfaceDal), narrowing, Drizzle helpers (server)
    ??? audit/                     # Audit table, triggers, retention helpers (server)
    ??? approval/                  # Pending store + state machine (server)
    ??? react/                     # CapabilitiesProvider, <Can>, <FieldControl> (client)
    ??? codegen/                   # YAML ? TS CLI (dev-time)
```

## Package responsibilities and boundaries

| Package | Runs on | May import from | Must NOT import from |
|---|---|---|---|
| `@<project>/contracts` | both | (no internal deps) | anything server-only |
| `@<project>/policy` | server | `contracts` | `dal`, `react`, `audit`, `approval` |
| `@<project>/dal` | server | `contracts`, `policy`, `audit`, `approval` | `react`, `codegen` |
| `@<project>/audit` | server | `contracts` | `react`, `dal` (audit is below dal) |
| `@<project>/approval` | server | `contracts`, `audit` | `react`, `dal` |
| `@<project>/react` | client | `contracts` | `policy`, `dal`, `audit`, `approval` |
| `@<project>/codegen` | dev CLI | `contracts` | `react`, `dal` |
| `apps/crm` | both | all packages, role-appropriate | ? |

**Enforcement:**

- TypeScript path aliases ensure non-`@<project>/*` direct relative imports are obvious.
- ESLint rule (`no-restricted-imports`) blocks the forbidden pairs above.
- Each `packages/*/package.json` has `"sideEffects": false` and the correct `"exports"` map so bundlers can tree-shake.
- Add a smoke test: importing any server-only package into a `"use client"` file fails at build.

## Why this split

- **`contracts` is the only package the client can import.** Everything else is server-side; this is what stops accidental leakage.
- **`policy` is below `dal`** so the DAL can require a `PermissionContext` produced by policy, but policy never knows about DB queries.
- **`audit` and `approval` are siblings of `dal`** (not under it), so they can be wired in as middleware/triggers without circular deps. `dal` orchestrates them; they don't reach into `dal`.
- **`react` only knows `contracts`.** This is the contract that lets the UI render without ever importing server code.
- **`codegen` is dev-time.** It produces files committed to `apps/crm/modules/*/generated/`. It does not run in production.

## Migration plan (Step 2 in `STATUS.md`)

### Decision: Step 2 complete (2026-05-28)

**Choice:** Monorepo layout is live ? `apps/web` (`@latch/web`) + seven stub `@latch/*` packages under `packages/`, npm workspaces, TS project references, ESLint `no-restricted-imports` boundaries.

**Rationale:** Package boundaries are enforceable from day one; Step 3 can add real code to the right packages without another structural migration.

Current state: monorepo scaffold. Migration steps below are historical reference.

1. `mkdir -p apps/web` and move:
   - `src/` ? `apps/web/`
   - `public/` ? `apps/web/public/`
   - `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json` ? `apps/web/`
2. Move `package.json` deps into `apps/web/package.json`; keep a slim root `package.json` with workspaces:
   ```json
   {
     "name": "<project>-monorepo",
     "private": true,
     "workspaces": ["apps/*", "packages/*"],
     "scripts": {
       "dev": "npm -w apps/web run dev",
       "build": "npm -w apps/web run build",
       "db:migrate": "node scripts/db-migrate.mjs",
       "db:docker:up": "docker compose up -d"
     }
   }
   ```
3. Create empty `packages/*` per the layout above with stub `package.json` and `src/index.ts` so workspace resolution works.
4. Add `tsconfig.base.json` with shared compiler options; each package extends it.
5. Add ESLint `no-restricted-imports` rules per the boundary table.
6. CI smoke check: `npm run build` succeeds.
7. Update README and STATUS to reflect new layout. Mark Step 2 done.

## Future extractions

- Sample app could move to `apps/trades-crm` if a second app appears (e.g. an admin-only console).
- Move `packages/*` to a separate publishable repo only when the platform stabilizes (post-v1).

### Decision: extract `@latch/pg-session` when Postgres surface grows (2026-06-04)

**Choice:** **Defer** a new package until extraction is clearly worth the churn. **Do not** move `withPermissionDb` into `@latch/dal` (would force `@latch/audit` / `@latch/approval` to import `dal` — circular with today’s graph). When triggered, extract shared Postgres session binding from [`packages/audit/src/permission-db.ts`](../../packages/audit/src/permission-db.ts) into **`@latch/pg-session`** (preferred name; **`@latch/db`** acceptable if shared pool/Drizzle helpers ship in the same package).

**Exports (target):** `withPermissionDb`, `bindPermissionSession`, `LATCH_DEFAULT_COMPANY_ID`.

**Dependency target:**

```
@latch/contracts
@latch/pg-session          ← pg only; no dal / audit / policy
@latch/policy              ← contracts only (unchanged)
@latch/audit, @latch/approval, @latch/dal, apps/*  → import pg-session
```

`@latch/audit` may **re-export** `withPermissionDb` during a deprecation window; new code should import `@latch/pg-session`.

**Trigger — extract when any of:**

1. **Second consumer app** (`apps/test1` or beyond) has **Postgres-backed business `StoreAdapter`s** (not only audit/IAM), so IAM + contacts + audit all import session binding from `@latch/audit` by name.
2. **Phase 07 RLS** work needs a documented home for session vars + future `SET LOCAL` helpers beyond T12.
3. **Import confusion** repeats (e.g. “why is role load in audit?”) and a sweep is already planned.

**Not a trigger alone:** test1 task 05 IAM scaffold using `withPermissionDb` — keep status quo until task **10** store wiring or Phase 07.

**Rationale:** Session binding is infrastructure shared by audit, approval, IAM, policy version, and future business stores — not audit domain logic. A bottom-layer package preserves the rule that `@latch/audit` must not import `@latch/dal` while every Postgres path uses the same T12 envelope. `@latch/policy` stays DB-free.

See also: [Phase 06 T12 decision](../phases/06-performance-safety/decisions.md#decision-db-session-vars--t12-2026-06-03), [test1 discussion `05-pg-session-package-home.md`](../../apps/test1/docs/discussions/05-pg-session-package-home.md).

## Related

- [`STATUS.md`](../../STATUS.md) ? Step 2
- [`scope.md`](../foundations/scope.md)
- [`overview.md`](../foundations/architecture-overview.md)
