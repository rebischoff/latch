# Latch — shared docs

Cross-cutting design, planning, and architecture for **Latch**. Anything shared across packages lives here; per-package deep-dives live in each package's own `docs/`.

> **Start with the root [`STATUS.md`](../../STATUS.md)** — the global quarterback (names the active phase). Then [`STATUS.md`](./STATUS.md) here — the **per-package status board**.

## Layout

```
packages/docs/                shared, cross-cutting (this folder)
  STATUS.md                   per-package status board
  foundations/                stable truth (vision, scope, glossary, threat model, …)
  reference/                  cross-cutting deep-dives (packages, compartments, api-style, ui-sync, …)
  phases/                     the delivery plan — self-contained phase folders, each with its own STATUS
  discussions/                pre-planning alignment docs
  discovery/                  spikes (RLS, post-v1)
  archive/                    completed history (the job_detail pilot)

packages/<pkg>/docs/          per-package docs (tasks + package-owned deep-dives)
apps/<app>/docs/              app/spike docs — independent of packages
```

## Per-package docs (owned by each package)

| Package | Docs |
|---------|------|
| `@latch/policy` | [`tasks/`](../policy/docs/tasks/README.md) · [`access-control.md`](../policy/docs/access-control.md) |
| `@latch/dal` | [`tasks/`](../dal/docs/tasks/README.md) · [`bulk-operations.md`](../dal/docs/bulk-operations.md) |
| `@latch/audit` | [`audit-and-lifecycle.md`](../audit/docs/audit-and-lifecycle.md) |
| `@latch/approval` | [`approval-trails.md`](../approval/docs/approval-trails.md) |
| `@latch/codegen` | [`docs/`](../codegen/docs/README.md) · [`tasks/`](../codegen/docs/tasks/README.md) |
| `@latch/contracts`, `@latch/react` | (no package-specific deep-dive yet) |

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
| [`foundations/typescript-monorepo.md`](./foundations/typescript-monorepo.md) | Bundler monorepo — extensionless relative imports |
| [`foundations/open-questions.md`](./foundations/open-questions.md) | Active + resolved decisions |

## Phases — the plan

| Document | Purpose |
|---|---|
| [`phases/README.md`](./phases/README.md) | **Phase map + how phases work** |
| [`phases/00-foundation/`](./phases/00-foundation/README.md) | contracts, policy, codegen, single-record DAL |
| [`phases/01-data-access/`](./phases/01-data-access/README.md) | list, projection, bulk (`job_list`) |
| [`phases/02-ui-sync/`](./phases/02-ui-sync/README.md) | `@latch/react`, `customer_detail` |
| [`phases/03-identity-iam/`](./phases/03-identity-iam/README.md) | users/roles in DB, IAM + Data master, auth |
| [`phases/04-audit-lifecycle/`](./phases/04-audit-lifecycle/README.md) | full audit, hard delete + recovery |
| [`phases/05-verification/`](./phases/05-verification/README.md) | accept/reject, verification gates |
| [`phases/06-performance-safety/`](./phases/06-performance-safety/README.md) | manifest cache, T5/T12 |
| [`phases/08-scoped-access/`](./phases/08-scoped-access/README.md) | scoped row filter | complete |
| [`phases/09-platform-packaging/`](./phases/09-platform-packaging/README.md) | extract reference adapters; template zero-glue; scaffold proof | **active (planned)** |
| [`phases/07-scale-out/`](./phases/07-scale-out/README.md) | multi-company, native RLS, publish (deferred) |

## Reference — cross-cutting deep-dives

| Document | Purpose |
|---|---|
| [`reference/platform-status.md`](./reference/platform-status.md) | **Where every package stands** (living snapshot) |
| [`reference/packages.md`](./reference/packages.md) | **Monorepo layout & import boundaries** |
| [`reference/compartments.md`](./reference/compartments.md) | **Compartment map** — independently testable concerns |
| [`reference/crm-and-phases.md`](./reference/crm-and-phases.md) | CRM harness vs package phases (side-by-side) |
| [`reference/permissions-and-ui-sync.md`](./reference/permissions-and-ui-sync.md) | Manifest, DAL, Zod, UI sync (spans packages) |
| [`reference/api-style.md`](./reference/api-style.md) | REST handlers + Server Actions decision |

> Package-owned deep-dives (`access-control`, `bulk-operations`, `audit-and-lifecycle`, `approval-trails`, `codegen-scope`, `metadata-and-codegen`) moved into their packages — see the per-package table above.

## Discovery & archive

| Document | Purpose |
|---|---|
| [`discovery/postgres-rls-and-security.md`](./discovery/postgres-rls-and-security.md) | RLS, column privileges (Phase 06 spike) |
| [`archive/step-3-pilot-surface.md`](./archive/step-3-pilot-surface.md) | Completed `job_detail` pilot (history) |
| [`archive/tasks/job_detail/`](./archive/tasks/job_detail) | Pilot task chain 00–21 (history) |

## Discussions — platform opinionation (2026-06-10)

Phases 00–08 delivered the runtime engine. The next alignment work is **what the platform locks vs what ships as swappable adapters**.

| Document | Purpose |
|---|---|
| [`discussions/10-opinionation-roadmap.md`](./discussions/10-opinionation-roadmap.md) | **Ordered sessions 1–9** — work one at a time |
| [`discussions/11-spine-adapters-skin.md`](./discussions/11-spine-adapters-skin.md) | Spine / adapters / skin taxonomy |
| [`discussions/12-audit-opinionation.md`](./discussions/12-audit-opinionation.md) | `@latch/audit` packaging (session 6) |

## How to contribute to docs

- Update existing docs over creating new ones; the maps above are curated.
- Mark tentative ideas with **TBD** or **Proposal** in headings.
- When a decision is final, add a dated **Decision** block at the top of the affected section, and record it in the relevant phase `decisions.md` or `foundations/open-questions.md`.
- A phase's `STATUS.md` is its quarterback; the root [`STATUS.md`](../../STATUS.md) only names the active phase.
- Keep STATUS files **short** and **current**.
