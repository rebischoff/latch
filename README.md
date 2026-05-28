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
| Database | PostgreSQL 16 — Neon (preview/prod) · Docker Compose (local) |
| ORM | Drizzle (planned) |
| Styling | Tailwind CSS |
| Layout | **Monorepo** — `apps/web` + `packages/*` |

## Quick start

```bash
npm install
docker compose up -d
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Health: `/api/health`.

> Latch uses port **3001** by default so it can run alongside other local Next.js apps on 3000.

## Repository layout

```
./
├── STATUS.md             # ← read first
├── docs/                 # Planning, glossary, discovery, roadmap
├── .cursor/rules/        # AI agent guidance
├── apps/
│   └── web/              # Next.js + sample app (trades-CRM)
├── packages/
│   ├── contracts/        # Manifest schema, Field IDs, base Zod
│   ├── policy/           # PolicyService (server)
│   ├── dal/              # DAL kernel (server)
│   ├── audit/            # Audit + retention (server)
│   ├── approval/         # Pending changes (server)
│   ├── react/            # CapabilitiesProvider, <Can>, <FieldControl>
│   └── codegen/          # YAML → TS CLI
├── docker-compose.yml    # Local Postgres
└── .env.example
```

See [`docs/planning/architecture/packages.md`](./docs/planning/architecture/packages.md).

## Documentation index

The full index lives in [`docs/README.md`](./docs/README.md). High-traffic entries:

- [`STATUS.md`](./STATUS.md) — what's next
- [`docs/planning/scope.md`](./docs/planning/scope.md) — v1 in / out
- [`docs/planning/vision.md`](./docs/planning/vision.md) — why this exists
- [`docs/planning/use-cases.md`](./docs/planning/use-cases.md) — pilot scenarios
- [`docs/planning/architecture/overview.md`](./docs/planning/architecture/overview.md)
- [`docs/planning/architecture/packages.md`](./docs/planning/architecture/packages.md)
- [`docs/planning/architecture/api-style.md`](./docs/planning/architecture/api-style.md)
- [`docs/planning/threat-model.md`](./docs/planning/threat-model.md)
- [`docs/roadmap.md`](./docs/roadmap.md)
