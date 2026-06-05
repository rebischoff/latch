# test1 — config (env)

Canonical Latch global options: [`docs/foundations/global-options.md`](../../../docs/foundations/global-options.md).

CRM per-app env pattern (same monorepo rule): [`../../crm/docs/CONFIG.md`](../../crm/docs/CONFIG.md#per-app-environment-files).

## Per-app environment files

test1 **must** have its own env files under `apps/test1/`, not under `apps/crm/` and not at the repo root.

| File | Committed? | When |
|------|------------|------|
| `apps/test1/.env.example` | **Yes** | Created in tasks **02+03** — copy to `.env.local` |
| `apps/test1/.env.local` | **No** (gitignored) | You create locally; holds secrets and `DATABASE_URL` |

### Why this matters (even before task 04)

You do not need a working `.env.local` to run an empty Next shell in **02+03**, but the **layout is decided now** so later tasks do not fight CRM:

| Concern | If test1 reused CRM’s `.env.local` |
|---------|-------------------------------------|
| **Database** | Migrations and DAL would hit CRM’s Neon branch; test1 IAM/grant experiments would corrupt or confuse CRM data. |
| **Auth** | `AUTH_SECRET` is Auth.js; test1 uses Better Auth on port **3003** with different cookie/session config. |
| **Scripts** | `db-migrate` today reads `apps/crm/.env.local`; test1’s `db:migrate:test1` (task **05**) will read `apps/test1/.env.local` only. |
| **Local dev** | Running `npm run dev` (CRM, 3002) and `npm run dev:test1` (3003) side by side requires two connection strings and two auth secrets. |

Next.js loads `.env*` from **`apps/test1/`** when the workspace runs `@latch/test1` scripts. That is independent of CRM’s env loading.

### When each variable is required

| Phase | Needs `.env.local`? |
|-------|---------------------|
| **02+03** — monorepo + shell | No (optional). Commit **`.env.example`** only. |
| **04** — Better Auth | Yes — `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| **05** — Neon + migrations | Yes — `DATABASE_URL` (test1 Neon branch); `LATCH_APP_ROLE_PASSWORD` on Neon |
| **10+** — Surfaces + DAL | Yes — same `DATABASE_URL` |

## Required (when those tasks run)

| Variable | Purpose | First needed |
|----------|---------|--------------|
| `DATABASE_URL` | Neon connection string (direct for migrate; pooled on Vercel) | Task **05** |
| `LATCH_APP_ROLE_PASSWORD` | Password for `latch_app` role created in migration **002** (Neon requires a strong value) | Task **05** on Neon |
| `BETTER_AUTH_SECRET` | Better Auth session secret | Task **04** |
| `BETTER_AUTH_URL` | App base URL (e.g. `http://localhost:3003`) | Task **04** |
| `TEST1_DEV_PASSWORD` | Seed user password for local dev (default `demo`) | Task **04** / **05** seed |

## `.env.example` template (committed in 02+03)

```bash
# Better Auth — required from task 04 (generate secret per Better Auth docs)
BETTER_AUTH_SECRET=replace-with-openssl-rand-hex-32
BETTER_AUTH_URL=http://localhost:3003

# Dev seed password (task 05)
TEST1_DEV_PASSWORD=demo

# Neon — required from task 05 (separate project/branch from CRM)
# DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require

# latch_app role password for migration 002 (required on Neon)
# LATCH_APP_ROLE_PASSWORD=replace-with-openssl-rand-base64-24

# Optional — DB-gated tests as latch_app role (after migrations)
# LATCH_APP_DATABASE_URL=postgresql://latch_app:...@host/db?sslmode=require
```

## Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `LATCH_MANIFEST_CACHE_MODE` | `none` \| `request` \| `ttl` | `request` in dev/prod |
| `LATCH_STUB_USER` | Vitest principal id (no HTTP auth) | unset |
| `LATCH_STUB_ROLE` | Vitest role id | unset |
| `LATCH_APP_DATABASE_URL` | DB-gated tests as `latch_app` role | unset |

## Manifest cache

Same semantics as CRM ([`apps/crm/docs/CONFIG.md`](../../crm/docs/CONFIG.md)):

- Reads: `resolveContext` may cache per request when `LATCH_MANIFEST_CACHE_MODE=request`.
- Writes: always `resolveContextFresh` / bypass cache.

## Better Auth vs Latch env

Better Auth owns session cookies and provider keys. Latch owns **`getPrincipal()`** reading session → user id, then DB for roles.

Do **not** put `roles[]` in Better Auth session custom fields for authorization — keep a single source of truth in `latch_user_roles` / future grant tables.

### Better Auth variables (task 04 — distinct from CRM)

CRM uses Auth.js and **`AUTH_SECRET`**. test1 uses Better Auth — **do not reuse CRM’s `AUTH_SECRET`** for `BETTER_AUTH_SECRET`.

| Variable | Required when | Purpose |
|----------|---------------|---------|
| `BETTER_AUTH_SECRET` | Task **04b+** | Session signing / encryption (≥32 chars; `openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Task **04b+** | App origin for callbacks — local dev: `http://localhost:3003` |
| `TEST1_DEV_PASSWORD` | Task **04e** / **05** seed | Shared password for seed users (default `demo`); not used by Better Auth config in **04b** |

Copy `apps/test1/.env.example` → `apps/test1/.env.local` before running the dev server with auth enabled.

### Better Auth (dev) — users until task 05

Task **04b** uses Better Auth’s **memory adapter** (no Neon). User rows do not persist across server restarts and are **not** synced to `latch_users`.

- **Login UI / E2E:** task **04e** auto-creates `admin@test1.local` in the memory adapter on first dev sign-in (password `TEST1_DEV_PASSWORD`, default `demo`). Task **05** seed aligns Better Auth users with `latch_users`.
- **04b smoke test:** `GET /api/auth/get-session` returns JSON (no session when logged out) — no seeded user required.

## Related

- [AUTH.md](./AUTH.md) · [DATABASE.md](./DATABASE.md) · [STACK.md](./STACK.md)
- Codegen (CRM scan today): [`../../crm/docs/CODEGEN.md`](../../crm/docs/CODEGEN.md)
