# 05 — Scaffold CLI (`latch new`)

> **Status:** Complete (2026-06-10). Next: [Phase 1 first app](../../../../apps/docs/phase-01-first-app.md).
>
> **Not sync codegen** — see [reference/codegen-scope.md](../reference/codegen-scope.md). Sync (`npm run codegen`) remains tasks **01–04** (complete).

## Goal

Ship a **one-time app scaffolder** so a new temp business app starts from a **clean slate** — not by copying `spike_business` or `spike_policy`. The CLI is the first thing we test; the first consumer app (`widgets` list + detail) is generated through it.

### Decision: sync ≠ scaffold (2026-06-06, reaffirmed 2026-06-10)

**Choice:** **`@latch/codegen`** remains build-time `YAML → TS` sync with `--check`. **`latch new`** (or `npm run latch:new`) is a separate one-time skeleton copier. Scaffold does not emit Surface YAML or business DDL.

**Rationale:** Conflating the two tools hid portability work (scan root, publish) and made it unclear what codegen owns. Task 05 proves the scaffold path on a fresh app before any spike is promoted.

### Decision: scaffolder + template live in `@latch/codegen`; target is location-aware (2026-06-10)

**Choice:** The golden skeleton moves from `apps/_template/` to **`packages/codegen/template/`**, and the copier moves from the root `scripts/latch-new.mjs` to **`@latch/codegen` source** (`scaffold.ts` + `scaffold-cli.ts`, run via `npm run -w @latch/codegen new`). The root `latch:new` script now **delegates** to the package. `latch new <name>` resolves its target by context:

- **Inside a Latch monorepo** (a `package.json` declaring an `apps/*` workspace, found by walking up from cwd) → `<root>/apps/<name>`.
- **Standalone** (no monorepo) → `<cwd>/<name>`, or `<cwd>` in place when the name is `.`.

Codegen's scan root is resolved the same way: monorepo → `apps/*/modules`; standalone → the project (cwd) tree (excluding `node_modules`/`.next`/`.git`/`dist`).

**Rationale:** Keeps all CLI in one package (no stray `apps/_template` workspace, no root copier script), and makes both `new` and `codegen` portable to consumer projects. The scaffold and sync code stay **separate modules** — "sync ≠ scaffold" still holds. Full standalone consumption (published `@latch/*` deps, portable migrate) remains Phase 07.

---

## Deliverable

| Artifact | Purpose |
|----------|---------|
| `packages/codegen/template/` | Golden skeleton — platform only, **no business tables**, empty `modules/` |
| `packages/codegen/src/scaffold.ts` | Location-aware target resolution + template copy/substitute |
| `packages/codegen/src/scaffold-cli.ts` | `latch new` entry (`npm run -w @latch/codegen new`) |
| `packages/codegen/src/workspace-root.ts` | `findMonorepoRoot` shared by scaffold + codegen scan root |
| Root `package.json` script | `"latch:new": "npm -w @latch/codegen run new --"` (delegates) |
| `scripts/db-migrate.mjs` | Register new app; drop dead `crm` / `test1` defaults |

**Invocation (target):**

```bash
npm run latch:new -- widgets
# → apps/widgets/  (@latch/widgets workspace)
```

**Post-scaffold instructions (printed by CLI):**

1. `cp apps/widgets/.env.example apps/widgets/.env.local` — set `DATABASE_URL`, `AUTH_SECRET`
2. `node scripts/db-migrate.mjs --app=widgets`
3. Add business surface YAML under `apps/widgets/modules/` (Phase 1)
4. `npm run codegen`
5. `npm run dev -w @latch/widgets`

---

## What the template contains

Opinionated **spine** only ([spine-vs-skin](../../../docs/discussions/00-overview.md#decision-opinionated-vs-flexible--spine-vs-skin-2026-06-05)):

| Area | Included | Not included |
|------|----------|--------------|
| **Migrations** | Platform chain: `latch_users`, `latch_user_roles`, `latch_roles` (+ `system_data` / `system_iam` seeds), `latch_role_*`, `latch_policy_version`, `latch_scopes`, `latch_audit` + immutability trigger, `latch_app` role, bootstrap super-admin (`system_iam` + `system_data`) | Business tables, fixture data |
| **Next.js** | Minimal `app/layout.tsx`, `app/page.tsx`, `next.config.ts` (webpack `@latch/*` aliases) | Sidebar, login, domain routes |
| **lib/** | Stubs: `db.ts`, `audit-bootstrap.ts`, `policy-registry.ts` (empty business registry) | `getPrincipal`, `resolveContext`, store adapters |
| **modules/** | `README.md` only | `*.surface.yaml`, `generated/` |

`latch_pending_changes` migration is **optional in v1 scaffold** — first temp apps skip approval wiring ([bootstrap f](../../../../apps/docs/bootstrap/f-explicitly-out-of-scope.md)).

---

## CLI behavior

1. **Resolve target** — monorepo → `apps/<slug>`; standalone → `./<slug>` (or `.` in place). Reject if the target already contains a `package.json`.
2. **Validate slug** — `^[a-z][a-z0-9_-]*$`.
3. **Copy** `packages/codegen/template/` recursively (skip `.gitkeep` placeholders as needed).
4. **Substitute** tokens: `__APP_SLUG__`, `__APP_PACKAGE__` (`@latch/<slug>`), `__APP_TITLE__`, dev port (next free `3003+` in monorepo, `3000` standalone).
5. **Print** context-aware next steps (monorepo vs standalone).

**Out of scope for this task:**

- Neon branch creation
- Generating `*.surface.yaml` or SQL for business tables
- `create-latch-app` npm package publish + published `@latch/*` deps for standalone apps (Phase 07)

---

## Verify (stop gate)

- [x] `packages/codegen/template/` contains platform migrations only (no `widgets` table); no `apps/_template` workspace.
- [x] `npm run latch:new -- widgets` creates `apps/widgets` without touching `spike_business`.
- [x] Run from outside a monorepo, `latch new <name>` creates `./<name>` (or `.` in place).
- [x] `node scripts/db-migrate.mjs --app=widgets` applies platform migrations on a clean Neon DB.
- [x] `npm run codegen` succeeds with zero surfaces (empty registry) or after Phase 1 YAML is added.
- [x] `npm run dev -w @latch/widgets` starts (placeholder home page).
- [x] This task **Status** → Complete; [`tasks/README.md`](./README.md) repoints at Phase 1 app docs.

---

## Sequencing

```
05 (this task)   →  latch new + packages/codegen/template/
Phase 1 app      →  widgets list + detail ([apps/docs/phase-01-first-app.md](../../../../apps/docs/phase-01-first-app.md))
Phase 2 bootstrap →  auth, authz, nav, forms, CRUD ([apps/docs/bootstrap/](../../../../apps/docs/bootstrap/README.md))
```

Tasks **01–04** (sync codegen) are independent and already complete.

---

## Related

- [Discussion 07 — Template / scaffold](../../../docs/discussions/07-template-scaffold.md)
- [Codegen scope](../reference/codegen-scope.md) — sync vs scaffold boundary
- [Codegen docs map](../README.md)
- [Apps docs — temp app bootstrap](../../../../apps/docs/README.md)
