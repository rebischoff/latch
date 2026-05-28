# Development & deployment

How we run Postgres locally vs on Vercel.

## Decision: Vercel + hosted Postgres (2026-05-27)

**Choice:**

| Environment | App | Database |
|-------------|-----|----------|
| **Local dev** | `npm run dev` | Docker Compose Postgres (default) or hosted URL |
| **Vercel preview / production** | Vercel deployment | **Hosted Postgres required** (e.g. [Neon](https://neon.tech)) — serverless functions cannot reach Docker on your laptop |

**Rationale:** Vercel has no long-lived local Postgres. Preview and production use `DATABASE_URL` (and per-company URLs when routing exists) pointing at Neon or equivalent.

## Recommended setup

1. **Daily dev:** `docker compose up -d` + `DATABASE_URL` in `.env.local` (defaults in `.env.example`).
2. **Neon:** One project; optional **branch per developer** or per PR preview; set `DATABASE_URL` in Vercel project env and locally when testing serverless behavior.
3. **Migrations:** Same Drizzle migrations run against Docker (local) and Neon (preview/prod) so schema stays identical to the company DB template.

## Vercel notes (TBD in implementation)

- Use **connection pooling** (Neon pooler or `@neondatabase/serverless`) — serverless opens many short connections.
- Set env vars per environment: `DATABASE_URL` for single-company dev; later `COMPANY_*` or routing service for database-per-company.
- Company-specific DBs on Neon: one database (or branch) per company, or one Neon project per company — provisioning spike in Phase 1.

## Related

- [global-options.md](./architecture/global-options.md)
- [glossary.md](./glossary.md) — Company (deployment)
