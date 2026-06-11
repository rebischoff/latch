# Development & deployment

How we run Postgres for local dev, preview, and production.

## Decision: Neon for all environments (2026-05-30)

**Choice:** **Neon** (hosted Postgres) is the default for **local dev**, **Vercel preview**, and **production**. Set `DATABASE_URL` to a Neon connection string in `apps/crm/.env.local`. **Docker Compose is not required** and is not part of the documented workflow.

**Rationale:** One database provider, no local container setup, matches Vercel serverless (functions cannot reach a laptop-only Postgres). Optional `docker-compose.yml` remains in the repo for contributors who want a fully offline DB.

**Supersedes:** Daily-dev guidance that assumed `docker compose up` (2026-05-27 table still accurate for Vercel + hosted Postgres; local default is now Neon, not Docker).

---

## Decision: Vercel + hosted Postgres (2026-05-27)

| Environment | App | Database |
|-------------|-----|----------|
| **Local dev** | `npm run dev` / `npm run dev:crm` | **Neon** — `DATABASE_URL` in `.env.local` (direct connection for migrate/psql) |
| **Vercel preview / production** | Vercel deployment | **Neon** — pooled connection string in Vercel env |

**Rationale:** Vercel has no long-lived local Postgres. Preview and production use `DATABASE_URL` pointing at Neon (or equivalent hosted Postgres).

## Recommended setup

1. **Neon project:** Create a project at [neon.tech](https://neon.tech). Copy the **direct** connection string (Dashboard → Connect) into `apps/crm/.env.local` as `DATABASE_URL`. Use the **pooled** string in Vercel project settings for preview/prod.
2. **Migrations:** From repo root, with `psql` installed:
   ```bash
   npm run db:migrate
   ```
   Reads `DATABASE_URL` from `apps/crm/.env.local` (see `scripts/db-migrate.mjs`). Same SQL applies to any Postgres host (Neon, optional Docker, etc.).
3. **App without Postgres:** Omit `DATABASE_URL` — job data uses the in-memory store; audit falls back to memory.

**Check connection:**

```bash
npm run db:check
```

**Audit (task 17):** With `DATABASE_URL` set, DAL `writeAudit` INSERTs into `latch_audit` via `audit-db-writer.ts`. `latch_audit` rows cannot be updated or deleted (DB trigger). Job data still uses the in-memory store until the Postgres DAL path lands.

## Neon tips

- **Branches:** Optional dev branch per developer or per PR; point `DATABASE_URL` at that branch’s connection string.
- **Pooling:** Use the pooler host (`-pooler` in hostname) on Vercel; prefer **direct** for `npm run db:migrate` and ad-hoc `psql`.
- **`psql`:** Install via Postgres client tools or `brew install libpq` (macOS). Query audit:
  ```bash
  psql "$DATABASE_URL" -c "SELECT occurred_at, action, entity_id FROM latch_audit ORDER BY occurred_at DESC LIMIT 10;"
  ```

## Optional: Docker Compose

Not required. If you want a local Postgres without Neon:

```bash
npm run db:docker:up
# set DATABASE_URL=postgresql://latch:latch@localhost:5432/latch in .env.local
npm run db:migrate
```

See root `docker-compose.yml`.

## Vercel notes (TBD in implementation)

- Use **connection pooling** (Neon pooler or `@neondatabase/serverless`) — serverless opens many short connections.
- Set env vars per environment: `DATABASE_URL` for single-company dev; later `COMPANY_*` or routing service for database-per-company.
- Company-specific DBs on Neon: one database (or branch) per company, or one Neon project per company — provisioning spike in Phase 1.

## Auth.js (Phase 03, D2)

### Decision: Auth.js on Next.js 16 (2026-06-02)

**Choice:** **Auth.js v5** (`next-auth@beta`, minimum Next.js 14) in `apps/crm` with App Router route handler at `/api/auth/[...nextauth]`.

**Rationale:** Auth.js v5 docs reference Next.js 16 (`middleware.ts` → `proxy.ts`); session uses JWT with **user id only**; roles load from `latch_user_roles` on each `getPrincipal()`. No D2 fallback required.

### Environment matrix

| Variable | Local dev | Vercel preview | Production |
|----------|-----------|----------------|------------|
| `AUTH_SECRET` | Required (`.env.local`) | Required (Vercel env) | Required |
| `CRM_DEV_PASSWORD` | Seed Credentials login | Optional (with Vercel password protection) | **Do not set** |
| `CRM_ENABLE_DEV_CREDENTIALS` | — | Set `true` only if preview uses Credentials | — |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Optional | When GitHub OAuth is configured | Per deployment IdP |
| `AUTH_URL` | Usually inferred (`http://localhost:3002`) | Vercel sets automatically | Deployment URL |

**Local sign-in:** `/login` → Credentials against `tech@demo.local`, `admin@demo.local`, `iam@demo.local` + `CRM_DEV_PASSWORD` (see [`../../apps/crm/docs/AUTH.md`](../../../apps/crm/docs/AUTH.md)).

**Production:** OAuth/OIDC provider per deployment; Credentials provider is disabled when `NODE_ENV=production` unless `CRM_ENABLE_DEV_CREDENTIALS=true` (preview only).

Generate `AUTH_SECRET`:

```bash
npx auth secret
```

## Stub principal (CI / tests)

Automated tests use env stubs — no Auth.js HTTP. See [`../../apps/crm/docs/AUTH.md`](../../../apps/crm/docs/AUTH.md).

| Env | Purpose | Default |
|-----|---------|---------|
| `LATCH_STUB_USER` | `Principal.id` | `seed-field-tech` (`SEED_TECH_ID` in `@latch/dal`) |
| `LATCH_STUB_ROLE` | Single role for `PolicyService` | `field_tech` |

**Switch role for manual policy checks (web app):**

```bash
# Default — field tech: financial Fields omitted on GET /api/jobs/[id]
npm run dev

# Office admin — financial Fields included
LATCH_STUB_ROLE=office_admin npm run dev
```

Optional: `LATCH_STUB_USER=seed-office-admin` when testing as the seeded admin user (`SEED_ADMIN_ID`).

**Seed jobs** (in-memory store): `seed-job-owned` (tech assignment), `seed-job-other` (admin assignment). See `@latch/dal` `seed.ts`.

**D2** (auth provider) resolved — Auth.js; see [open-questions.md](./open-questions.md) Resolved table.

## Related

- [global-options.md](./global-options.md)
- [glossary.md](./glossary.md) — Company (deployment)
