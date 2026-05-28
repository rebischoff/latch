# Documentation

Design, planning, and architecture for **Latch**.

> **Start with [`STATUS.md`](../STATUS.md)** at the repo root. It always shows the current focus and immediate next step.

## Planning

| Document | Purpose |
|---|---|
| [`scope.md`](./planning/scope.md) | **What is in / out of v1.** Canonical list. |
| [`vision.md`](./planning/vision.md) | One-line pitch, problem, audience |
| [`use-cases.md`](./planning/use-cases.md) | Trades-CRM personas + concrete scenarios |
| [`requirements.md`](./planning/requirements.md) | Structured requirements (R1–R13) |
| [`glossary.md`](./planning/glossary.md) | Surface, Field, Manifest, DAL, etc. |
| [`naming.md`](./planning/naming.md) | Codename + final-name TBD process |
| [`threat-model.md`](./planning/threat-model.md) | T1–T17 threats and controls |
| [`development.md`](./planning/development.md) | Vercel + Neon + Docker local |

## Architecture

| Document | Purpose |
|---|---|
| [`overview.md`](./planning/architecture/overview.md) | High-level system shape |
| [`packages.md`](./planning/architecture/packages.md) | **Monorepo layout & import boundaries** |
| [`api-style.md`](./planning/architecture/api-style.md) | REST handlers + Server Actions decision |
| [`access-control.md`](./planning/architecture/access-control.md) | RBAC, Fields, Surfaces, role merge |
| [`permissions-and-ui-sync.md`](./planning/architecture/permissions-and-ui-sync.md) | Manifest, DAL, Zod, UI sync (decisions) |
| [`metadata-and-codegen.md`](./planning/architecture/metadata-and-codegen.md) | Surface YAML → Zod / types codegen |
| [`bulk-operations.md`](./planning/architecture/bulk-operations.md) | Bulk update/soft-delete design |
| [`audit-and-lifecycle.md`](./planning/architecture/audit-and-lifecycle.md) | Audit log, soft delete |
| [`approval-trails.md`](./planning/architecture/approval-trails.md) | Accept/reject workflow |
| [`global-options.md`](./planning/architecture/global-options.md) | Platform defaults (v1 vs deferred) |

## Discovery

| Document | Purpose |
|---|---|
| [`postgres-rls-and-security.md`](./planning/discovery/postgres-rls-and-security.md) | RLS, column privileges (Phase 4 — post-v1) |

## Process

| Document | Purpose |
|---|---|
| [`open-questions.md`](./planning/open-questions.md) | Active + resolved decisions |
| [`roadmap.md`](./roadmap.md) | Phased delivery plan |
| [`STATUS.md`](../STATUS.md) | Live next-step (quarterback file) |

## How to contribute to docs

- Update existing docs over creating new ones; the index above is curated.
- Mark tentative ideas with **TBD** or **Proposal** in headings.
- When a decision is final, add a dated **Decision** block at the top of the affected section.
- Move resolved items from [`open-questions.md`](./planning/open-questions.md) → the appropriate architecture doc + the "Resolved" table.
- Keep [`STATUS.md`](../STATUS.md) **short** and **always current**.
