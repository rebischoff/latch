# Documentation

Design, planning, and architecture for **Latch**.

> **Start with [`STATUS.md`](../STATUS.md)** at the repo root — the global quarterback. It names the **active phase**; per-phase status lives in each phase folder.

## Map

```
docs/
  foundations/   stable, cross-cutting truth (vision, scope, glossary, threat model, …)
  reference/     topic deep-dives (access control, DAL/UI sync, bulk, audit, packages, …)
  phases/        the delivery plan — self-contained phase folders, each with its own STATUS
  discovery/     spikes (RLS, post-v1)
  archive/       completed work kept as read-only history (the job_detail pilot)
```

## Apps (monorepo)

| Path | Status |
|------|--------|
| [`apps/web/`](../apps/web/) | Runnable pilot — `job_detail` |
| [`apps/crm/`](../apps/crm/) | **Planning only** — minimal Latch proof harness ([`PLAN.md`](../apps/crm/docs/PLAN.md), Ant Design, no Tailwind) |

## Foundations — read these first

| Document | Purpose |
|---|---|
| [`foundations/vision.md`](./foundations/vision.md) | One-line pitch, problem, audience |
| [`foundations/scope.md`](./foundations/scope.md) | **What is in / out of v1.** Canonical list. |
| [`foundations/glossary.md`](./foundations/glossary.md) | Surface, Field, Manifest, DAL, etc. |
| [`foundations/use-cases.md`](./foundations/use-cases.md) | Trades-CRM personas + concrete scenarios |
| [`foundations/requirements.md`](./foundations/requirements.md) | Structured requirements (R1–R13) |
| [`foundations/threat-model.md`](./foundations/threat-model.md) | T1–T17 threats and controls |
| [`foundations/architecture-overview.md`](./foundations/architecture-overview.md) | High-level system shape |
| [`foundations/global-options.md`](./foundations/global-options.md) | Platform defaults (v1 vs deferred) |
| [`foundations/naming.md`](./foundations/naming.md) | Name + domain terms |
| [`foundations/development.md`](./foundations/development.md) | Vercel + Neon (all envs); stub principal |
| [`foundations/open-questions.md`](./foundations/open-questions.md) | Active + resolved decisions |

## Phases — the plan

| Document | Purpose |
|---|---|
| [`phases/README.md`](./phases/README.md) | **Phase map + how phases work** (sequenced but re-orderable) |
| [`phases/00-foundation/`](./phases/00-foundation/README.md) | contracts, policy, codegen, single-record DAL |
| [`phases/01-data-access/`](./phases/01-data-access/README.md) | list, projection, bulk (`job_list`) — **active** |
| [`phases/02-ui-sync/`](./phases/02-ui-sync/README.md) | `@latch/react`, `customer_detail` |
| [`phases/03-identity-iam/`](./phases/03-identity-iam/README.md) | users/roles in DB, IAM + Data master, auth |
| [`phases/04-audit-lifecycle/`](./phases/04-audit-lifecycle/README.md) | full audit, hard delete + recovery |
| [`phases/05-verification/`](./phases/05-verification/README.md) | accept/reject, verification gates |
| [`phases/06-performance-safety/`](./phases/06-performance-safety/README.md) | manifest cache, RLS surface-gate |
| [`phases/07-scale-out/`](./phases/07-scale-out/README.md) | multi-company, publish packages |

## Reference — deep dives

| Document | Purpose |
|---|---|
| [`reference/packages.md`](./reference/packages.md) | **Monorepo layout & import boundaries** |
| [`reference/crm-and-phases.md`](./reference/crm-and-phases.md) | **CRM harness vs package phases** (side-by-side dev) |
| [`reference/access-control.md`](./reference/access-control.md) | RBAC, Fields, Surfaces, role merge |
| [`reference/permissions-and-ui-sync.md`](./reference/permissions-and-ui-sync.md) | Manifest, DAL, Zod, UI sync (decisions) |
| [`reference/metadata-and-codegen.md`](./reference/metadata-and-codegen.md) | Surface YAML → Zod / types codegen |
| [`reference/api-style.md`](./reference/api-style.md) | REST handlers + Server Actions decision |
| [`reference/bulk-operations.md`](./reference/bulk-operations.md) | Bulk update/delete design |
| [`reference/audit-and-lifecycle.md`](./reference/audit-and-lifecycle.md) | Audit log + delete semantics |
| [`reference/approval-trails.md`](./reference/approval-trails.md) | Accept/reject workflow |

## Discovery & archive

| Document | Purpose |
|---|---|
| [`discovery/postgres-rls-and-security.md`](./discovery/postgres-rls-and-security.md) | RLS, column privileges (Phase 06 spike) |
| [`archive/step-3-pilot-surface.md`](./archive/step-3-pilot-surface.md) | Completed `job_detail` pilot (history) |
| [`archive/tasks/job_detail/`](./archive/tasks/job_detail/) | Pilot task chain 00–21 (history) |

## How to contribute to docs

- Update existing docs over creating new ones; the maps above are curated.
- Mark tentative ideas with **TBD** or **Proposal** in headings.
- When a decision is final, add a dated **Decision** block at the top of the affected section, and record it in the relevant phase `decisions.md` or `foundations/open-questions.md`.
- A phase's `STATUS.md` is its quarterback; the root [`STATUS.md`](../STATUS.md) only names the active phase.
- Keep STATUS files **short** and **current**.
