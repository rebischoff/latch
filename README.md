# Latch

> 👉 **Start here:** [`STATUS.md`](./STATUS.md) — current focus, next step, blockers.

A library set for building **business data apps** on **Next.js + PostgreSQL** with **field-level access control** and **frontend/backend permission sync**. The platform packages are vertical-agnostic; the first pilot is a small **service-trades CRM** sample app.

## What it offers

| Concern | What the platform does |
|---|---|
| **Authorization** | Server-resolved manifest of Surface + Field permissions per principal |
| **Data access** | A DAL kernel that narrows queries/writes to the manifest — no raw DB from handlers |
| **Frontend sync** | UI gates and Field controls render from the same manifest the server enforces |
| **Validation** | Generated Zod schemas, narrowed per user, strict on writes |
| **Audit** | Append-only log per mutation, with retention defaults |
| **Approval** | Pending-change workflow with audit linkage (all-or-nothing in v1) |
| **Bulk ops** | Per-row permission evaluation, partial-success reporting |

## Status

**Phase 0 — Scaffold & planning.** Architecture is largely decided; code is a Next.js scaffold + planning docs. See [`STATUS.md`](./STATUS.md) for the immediate next step.

## Stack (current scaffold)

| Layer | Choice |
|---|---|
| App / API | Next.js 16 (App Router), TypeScript |
| Hosting | Vercel (preview / prod) |
| Database | PostgreSQL — **Neon** (local dev, preview, prod) |
| ORM | Drizzle (planned) |
| Styling | Tailwind CSS |
| Layout | **Monorepo** — `apps/crm` + `packages/*` |

## Quick start

```bash
npm install
cp apps/crm/.env.example apps/crm/.env.local
# Edit apps/crm/.env.local — set DATABASE_URL to your Neon direct connection string
npm run db:migrate   # optional: needs psql; skip if you only use the in-memory store
npm run dev
```

Open [http://localhost:3002/login](http://localhost:3002/login). Seed users: `tech@demo.local`, `admin@demo.local`.

> The CRM app uses port **3002** by default so it can run alongside other local Next.js apps on 3000.

Database setup (Neon, migrations, audit): [`docs/foundations/development.md`](./docs/foundations/development.md).

## Repository layout

```
./
├── STATUS.md             # ← read first
├── docs/                 # Planning, glossary, discovery, roadmap
├── .cursor/rules/        # AI agent guidance
├── apps/
│   └── crm/              # The single Next.js app + Latch proof harness (Ant Design)
├── packages/
│   ├── contracts/        # Manifest schema, Field IDs, base Zod
│   ├── policy/           # PolicyService (server)
│   ├── dal/              # DAL kernel (server)
│   ├── audit/            # Audit + retention (server)
│   ├── approval/         # Pending changes (server)
│   ├── react/            # CapabilitiesProvider, <Can>, <FieldControl>
│   └── codegen/          # YAML → TS CLI
├── docker-compose.yml    # Optional local Postgres (not required)
└── .env.example
```

See [`docs/reference/packages.md`](./docs/reference/packages.md).

## Documentation index

The full index lives in [`docs/README.md`](./docs/README.md). High-traffic entries:

- [`STATUS.md`](./STATUS.md) — what's next
- [`docs/foundations/scope.md`](./docs/foundations/scope.md) — v1 in / out
- [`docs/foundations/vision.md`](./docs/foundations/vision.md) — why this exists
- [`docs/foundations/use-cases.md`](./docs/foundations/use-cases.md) — pilot scenarios
- [`docs/foundations/architecture-overview.md`](./docs/foundations/architecture-overview.md)
- [`docs/reference/packages.md`](./docs/reference/packages.md)
- [`docs/reference/api-style.md`](./docs/reference/api-style.md)
- [`docs/foundations/threat-model.md`](./docs/foundations/threat-model.md)
- [`docs/roadmap.md`](./docs/roadmap.md)
