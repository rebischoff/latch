# Scaffold runbook — `latch new`

> **Audience:** You just ran `npm run latch:new -- <slug>` in the Latch monorepo.  
> **Template:** `packages/codegen/template/` · **CLI:** `packages/codegen/src/scaffold-cli.ts`

## What the CLI does automatically

| Step | Action |
|------|--------|
| Copy | `packages/codegen/template/` → `./<slug>/` at repo root |
| Tokens | `__APP_SLUG__`, `__APP_PACKAGE__`, `__APP_PORT__`, `__APP_REGISTRY__` |
| Workspace | Appends `"<slug>"` to root `package.json` `workspaces` |
| Port | First free port from **3003** (scans sibling `package.json` `--port` values) |
| Grants | `lib/latch.ts` preloads `latch_role_grants` per request via `@latch/app-kit` |

## Manual steps (today)

1. **`npm install`** (repo root) — links the new workspace to `@latch/*`
2. **`cp <slug>/.env.example <slug>/.env.local`** — see env table below
3. **`node scripts/db-migrate.mjs --dir=<slug>`** — platform `001`–`012`; optional dev seeds `013`+ when present
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

Dev stub (after migration `013_pilot_roles_seed.sql`):

```
LATCH_STUB_USER=seed-field-tech
```

When `LATCH_STUB_USER` matches a `latch_users.id` row, `getPrincipal` loads roles from `latch_user_roles` (DB-backed UUIDs). `LATCH_STUB_ROLE` is only a fallback when the user row is absent.

## Migrations

| Range | Content |
|-------|---------|
| `001`–`012` | Platform (always) |
| `013_pilot_roles_seed.sql` | Optional dev seed: `field_tech` / `office_admin` UUID roles + grants + seed users |
| `014_business_schema.sql` | Placeholder in template; replace when adding domain tables |

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
2. Add `migrations/014_*.sql` business DDL (codegen cross-checks columns)
3. `npm run codegen -w @latch/<slug>` → wire `policy-registry.ts`
4. Run migrate (includes `013` seed if using pilot roles)
5. Add DAL/routes when ready (`lib/jobs/`, `app/api/jobs/`) — jobs store may stay in-memory until Phase 07

## Improvements backlog

| Item | Why |
|------|-----|
| **Run `npm install` in CLI** | After workspace registration |
| **IAM role editor in template** | CRUD grants without SQL seed |
| **Postgres job store** | Phase 07 |
| **Hide migration 006 password in psql output** | Dev ergonomics |

## Pitfalls (2026-06-11, `temp_app`)

1. **Workspace not linked** — CLI patches `workspaces`; still run `npm install`
2. **`BETTER_AUTH_URL` wrong port** — use scaffolded port
3. **Auth 500** — use `createAuthRouteHandlers(getAuth)` (fixed in template)
4. **Copied `*.policies.yaml`** — delete; grants are DB-only
5. **Empty manifests for app roles** — run `013` seed or insert `latch_role_grants`; template preloads from DB
6. **Surface YAML old format** — columns need `{ column, type }` objects

## Related

- [05 — Scaffold CLI](./tasks/05-scaffold-cli.md)
- [policy tasks README](../../policy/docs/tasks/README.md) — runtime roles
- [development.md](../../_docs/foundations/development.md)
