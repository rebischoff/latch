# test1 — stack

Aligned with CRM unless noted. Package boundaries: [`docs/reference/packages.md`](../../../docs/reference/packages.md).

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 App Router | Match CRM pin; read `node_modules/next/dist/docs/` before writing app code |
| UI | **Ant Design 6** + `@ant-design/icons` | **No Tailwind** |
| Forms | **React Hook Form** only | Writable Zod from codegen; `.strict()` on patch |
| Auth | **[Better Auth](https://better-auth.com/)** | CRM uses Auth.js — test1 only |
| DB | **Neon** Postgres | Separate project/branch from CRM |
| ORM | Drizzle (schema) + SQL migrations | Same pattern as CRM |
| Permissions UI | `@latch/react` | Client imports `contracts` + `react` only |
| Data / policy | `@latch/policy`, `@latch/dal`, `@latch/audit` | Server only |
| Codegen | Root `npm run codegen` | **CRM-only scan until task 10** — then multi-app; see [`../../crm/docs/CODEGEN.md`](../../crm/docs/CODEGEN.md) |
| Test | Vitest | Stub principal env for unit/e2e without HTTP auth |
| Bundler (02+03) | Turbopack (Next 16 default) | No `--webpack` until `@latch/dal` / audit aliases needed (mirror CRM workaround later if required) |
| Env | `apps/test1/.env.local` | Per-app; see [CONFIG.md](./CONFIG.md) |

## Import boundaries (enforce)

| App code | May import |
|----------|------------|
| Server (RSC, actions, routes) | All `@latch/*` as appropriate |
| Client components | `@latch/contracts`, `@latch/react` only |

## Dev scripts (tasks 02+03 / 05)

| Script | Purpose | Task |
|--------|---------|------|
| `npm run dev:test1` | Next dev on port **3003** | **02+03** |
| `npm run db:migrate:test1` | Apply `apps/test1/migrations/*.sql` | **05** |

## Related

- [CONFIG.md](./CONFIG.md) · [AUTH.md](./AUTH.md) · [DATABASE.md](./DATABASE.md)
