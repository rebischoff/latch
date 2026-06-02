# Trades CRM (`apps/crm`)

> **Status:** Steps A + B (jobs split view: `job_list` table + `job_detail` pane). Customers and real auth gated on later phases.

## Purpose

A **minimal** Ant Design app that proves every `@latch/*` package works together. Not a product, not a full CRM — a **visual integration harness**.

## Run locally

```bash
# From repo root (port 3002; apps/web uses 3001)
npm install
cp apps/crm/.env.example apps/crm/.env.local   # optional; default password is demo
npm run dev:crm
```

Open [http://localhost:3002/login](http://localhost:3002/login). Seed users: `tech@demo.local`, `admin@demo.local` (password: `CRM_DEV_PASSWORD` or `demo`).

| Doc | Contents |
|-----|----------|
| [`docs/PLAN.md`](./docs/PLAN.md) | Scope, proof matrix, build order, done criteria |
| [`docs/TASKS.md`](./docs/TASKS.md) | Step-by-step checklist |
| [`docs/LAYOUT.md`](./docs/LAYOUT.md) | Side-by-side list + detail, overall look (Ant Design only) |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Postgres plan for this app |
| [`docs/AUTH.md`](./docs/AUTH.md) | Login / logout (stub → real auth later) |
| [`../../docs/reference/crm-and-phases.md`](../../docs/reference/crm-and-phases.md) | How `apps/crm` and package phases develop side-by-side |

## Rules (non-negotiable)

1. **Prove packages only** — no feature unless it exercises a Latch capability.
2. **Stay simple** — no polish, dashboards, or trades workflows beyond the three v1 Surfaces.
3. **Ant Design only** — no Tailwind in this app. **Forms: React Hook Form** — do not use antd `Form`.
4. **DAL only** — no raw DB from routes or components.

## Related

- Platform scope: [`../../docs/foundations/scope.md`](../../docs/foundations/scope.md)
- Phases: [`../../docs/phases/README.md`](../../docs/phases/README.md)
