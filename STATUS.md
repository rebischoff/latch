# STATUS ù what's next

> **The "quarterback" file.** When in doubt, start here. Always read this first.
> Updated: 2026-05-28.

This file is the single source of truth for **current focus, immediate next step, and active blockers**. It is short on purpose. Detail lives in [`docs/`](./docs/README.md).

---

## Project at a glance

- **Name:** **Latch** ù see [naming](./docs/planning/naming.md).
- **Phase:** 0 ù Scaffold & planning.
- **Goal of v1:** A reusable library set for **field-level data access-control** on **Postgres** with **frontend/backend permission sync**, proven by a small **trades-CRM sample app**.
- **Solo dev. Single company. Internal use first.**

---

## Right now ù do this next

### Step 3 ù Build the first Surface end-to-end

- Pilot Surface: **`job_detail`** (a work order screen). See [`docs/planning/use-cases.md`](./docs/planning/use-cases.md).
- Goal: walk every concept through a single screen ù YAML ? codegen ? manifest ? DAL narrow ? Zod strict ? UI gate ? audit. Skip anything not needed for this Surface.
- Definition of done in [`docs/planning/scope.md`](./docs/planning/scope.md).

---

## Recently completed

### Step 2 ù Monorepo layout (2026-05-28)

- `apps/web/` ù Next.js app (`@latch/web`)
- `packages/{contracts,policy,dal,audit,approval,react,codegen}/` ù stub `@latch/*` packages
- npm workspaces, TS project refs, ESLint import boundaries
- Plan: [`docs/planning/architecture/packages.md`](./docs/planning/architecture/packages.md)

---

## Active decisions needed (small)

These block forward progress but are small enough to resolve in one sitting:

| # | Decision | Where it goes |
|---|---|---|
| D2 | Auth provider for v1 (Clerk / NextAuth / custom) | [`open-questions.md`](./docs/planning/open-questions.md) |
| D3 | Confirm pilot Surface = `job_detail` (or alternate) | [`use-cases.md`](./docs/planning/use-cases.md) |
| D4 | Single role-merge mode for v1: `union_grants` only | [`access-control.md`](./docs/planning/architecture/access-control.md) ù proposed |
| D5 | Defer RLS to post-v1 | [`postgres-rls-and-security.md`](./docs/planning/discovery/postgres-rls-and-security.md) ù proposed |

---

## v1 scope (in / out at a glance)

**In:** single company, three Surfaces (`job_detail`, `job_list`, `customer_detail`), Field-level perms, `union_grants` + `denyWins`, REST handler factory + Server Action helper, audit triggers, soft delete, all-or-nothing approval (internal reviewers), bulk update/delete with manifest gating, codegen CLI with drift check.

**Out (deferred):** multi-company DB routing, RLS, hard delete, partial approvals, external reviewers, the other three role-merge modes, admin UI as a product, GraphQL, tRPC.

Full list: [`scope.md`](./docs/planning/scope.md).

---

## Health checks

| Area | State |
|---|---|
| Docs | Architecture-complete for v1; some open questions remain (see above) |
| Code | Monorepo scaffold ó `apps/web` + stub `@latch/*` packages, health route |
| Tests | None yet |
| CI | None yet |
| Threat model | Drafted ([`threat-model.md`](./docs/planning/threat-model.md)); tests not implemented |

---

## How to use this file

1. Anytime you (or an AI agent) start a session: **read this file first.**
2. When a step completes, **edit the "Right now" section** to point at the next step.
3. Keep this file short. If a section grows, move detail into `docs/` and link.
4. Decisions go in the relevant architecture doc with a dated **Decision** block; this file only summarizes.

---

## Pointers

- Roadmap (phased): [`docs/roadmap.md`](./docs/roadmap.md)
- Architecture index: [`docs/README.md`](./docs/README.md)
- Open questions: [`docs/planning/open-questions.md`](./docs/planning/open-questions.md)
- Scope (in / out): [`docs/planning/scope.md`](./docs/planning/scope.md)
- Monorepo plan: [`docs/planning/architecture/packages.md`](./docs/planning/architecture/packages.md)
