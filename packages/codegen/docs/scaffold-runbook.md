# Scaffold runbook — `latch new`

> **Audience:** You just ran `npm run latch:new -- <slug>` in the Latch monorepo.  
> **Template:** `packages/codegen/template/` · **CLI:** `packages/codegen/src/scaffold-cli.ts`

## What the CLI does automatically

| Step | Action |
|------|--------|
| Copy | `packages/codegen/template/` → `./apps/<slug>/` |
| Tokens | `__APP_SLUG__`, `__APP_PACKAGE__`, `__APP_PORT__`, `__APP_REGISTRY__`, `__MONOREPO_REL__` |
| Workspace | Ensures `"apps/*"` is in root `package.json` `workspaces` |
| Port | First free port from **3003** (scans sibling `package.json` `--port` values) |
| Grants | `lib/latch.ts` preloads `latch_role_grants` per request via `@latch/app-kit` |

## Manual steps (today)

1. **`npm install`** (repo root) — links the new workspace to `@latch/*`
2. **`cp apps/<slug>/.env.example apps/<slug>/.env.local`** — see env table below
3. **`node scripts/db-migrate.mjs --dir=apps/<slug>`** — platform `001`–`013`
4. **Surfaces** — add `modules/**/*.surface.yaml` only (**not** `*.policies.yaml`), then `npm run codegen -w @latch/<slug>`
5. Wire `policy-registry.ts` with generated `*SurfacePolicyDef` imports
6. **`npm run dev -w @latch/<slug>`**

## Policy model (runtime DB — not YAML)

| Source | What it defines |
|--------|-----------------|
| `*.surface.yaml` + codegen | **Vocabulary** — Field ids, action verbs, Zod schemas (`*SurfacePolicyDef`) |
| `latch_roles` + `latch_role_surfaces` + `latch_role_grants` | **Grants** — who gets what (CRUD via IAM role editor, or SQL seed) |
| `latch_user_roles` | **Assignment** — which users hold which roles |
| `PolicyService` | Merges vocabulary + DB grants + system role synthesis |

**`*.policies.yaml` is retired** — do not copy into new apps. Grants live in Postgres.

Template `lib/latch.ts` calls `preloadRoleGrantsFromDb(getPool(), principalRoleIds(principal))` on each request (via `createResolveContext({ getPolicyService })`).

## Environment (`.env.local`)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** for runtime; use **direct** (non-pooler) for migrate if pooler errors |
| `DATABASE_URL_DIRECT` | Optional; migrate falls back to `DATABASE_URL` |
| `LATCH_APP_ROLE_PASSWORD` | **Required on Neon** (`openssl rand -base64 24`). Same password if reusing a DB where `latch_app` already exists |
| `AUTH_SECRET` / `BETTER_AUTH_SECRET` | `npx auth secret` |
| `BETTER_AUTH_URL` | `http://localhost:<port>` — must match scaffolded dev port (`__APP_PORT__` in `.env.example`) |
| `LATCH_SETUP_KEY` | Install token for first-run `/setup` (e.g. `openssl rand -base64 24`) |

Optional dev stub (bypasses Better Auth when a `latch_users` row exists):

```
LATCH_STUB_USER=<latch_users.id>
```

Resolve id: `SELECT id FROM latch_users WHERE login_name = '<name>';`

`LATCH_STUB_ROLE` is a **test-only fallback** when the user row is absent (CI/e2e).

## Migrations

| Range | Content |
|-------|---------|
| `001`–`012` | Platform catalog, audit, scopes, `latch_app` role |
| `013` | **`013_latch_identity_guards.sql`** — `login_name`, `setup_complete`, DB triggers ([P4b amendment](../../policy/docs/tasks/00-decisions-needed.md#amendment-first-run-setup--db-identity-guards-2026-06-13)) |
| `014+` | Business DDL, domain fixtures, runtime app-role seeds when needed |

### First-run setup

> **Locked (2026-06-13):** [P4b amendment](../../policy/docs/tasks/00-decisions-needed.md#amendment-first-run-setup--db-identity-guards-2026-06-13) · Reference: [`apps/subhub/docs/tasks/09-dev-roles-seed.md`](../../../apps/subhub/docs/tasks/09-dev-roles-seed.md)

After migrate, **`latch_users` is empty**. The consumer app implements `/setup`:

| Step | Action |
|------|--------|
| Gate | Redirect to `/setup` when no users exist and `setup_complete = false` |
| Form | `LATCH_SETUP_KEY` + **login_name** + password |
| Server | Create `latch_users` row + assign `system_data` + `system_iam` + set `setup_complete` |
| Login | Username **or** linked `login_email` later (`resolveLatchUserId`) |

**DB guards (migration 013):** `role_class` immutable; system catalog rows not deletable; last `system_data` / `system_iam` holder cannot be unassigned (trigger + DAL).

**Do not:** SQL seed users in migrate; seed app roles or IAM grant rows; rely on `bootstrap-admin` (removed from `007`).

IAM access for Slice 0 works via `PolicyService` synthesis — no sparse grant matrix required.

**App roles** (`role_class = 'app'`) and their grants are created later via the **IAM role editor** or domain-specific seeds once business surfaces exist. Multi-persona fixtures for policy testing live in [`fixtures/crm-proof/`](../../../fixtures/crm-proof/) — not in the scaffold default.

After a DB wipe:

```bash
psql "$DATABASE_URL_DIRECT" -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO PUBLIC;"
node scripts/db-migrate.mjs --dir=<slug>
```

## Verify

```bash
node scripts/db-migrate.mjs --dir=<slug> --check
psql "$DATABASE_URL_DIRECT" -c "SELECT id FROM latch_users LIMIT 1;"
npm run dev -w @latch/<slug>
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:<port>/api/auth/get-session
```

Expect **200** (empty session) or **401** — not **500**.

Check grants loaded:

```bash
psql "$DATABASE_URL_DIRECT" -c \
  "SELECT surface_id, field_id, action FROM latch_role_grants LIMIT 5;"
```

## Adding business domain (trades-CRM example)

1. Copy `modules/job/*.surface.yaml` from `fixtures/crm-proof/` (typed `column` + `type` format)
2. Implement `/setup` per [First-run setup](#first-run-setup) (SubHub task **09** is the reference)
3. Add `migrations/014_*.sql` (or higher) business DDL (codegen cross-checks columns)
4. `npm run codegen -w @latch/<slug>` → wire `policy-registry.ts`
5. Run migrate; add **app** roles and sparse grants via IAM editor or later seeds when business surfaces need them
6. Add DAL/routes when ready (`lib/jobs/`, `app/api/jobs/`) — jobs store may stay in-memory until Phase 07

## Improvements backlog

| Item | Why |
|------|-----|
| **Run `npm install` in CLI** | After workspace registration |
| **IAM role editor in template** | CRUD grants without SQL seed |
| **Postgres job store** | Phase 07 |
| **Hide migration 006 password in psql output** | Dev ergonomics |

## Pitfalls (2026-06-11, scaffolded apps)

1. **Workspace not linked** — CLI patches `workspaces`; still run `npm install`
2. **`BETTER_AUTH_URL` wrong port** — use scaffolded port
3. **Auth 500** — use `createAuthRouteHandlers(getAuth)` (fixed in template)
4. **Copied `*.policies.yaml`** — delete; grants are DB-only
5. **Empty manifests for app roles** — expected until app roles exist; `system_iam` / `system_data` work via synthesis. Add `latch_role_grants` only for `role_class = 'app'` rows (IAM editor or domain seed), not for IAM Slice 0
6. **Surface YAML old format** — columns need `{ column, type }` objects

## Related

- [05 — Scaffold CLI](./tasks/05-scaffold-cli.md)
- [policy tasks README](../../policy/docs/tasks/README.md) — runtime roles
- [development.md](../../_docs/foundations/development.md)
