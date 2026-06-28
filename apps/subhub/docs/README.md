# SubHub documentation

End-to-end **service-trades / AV integration** business app on Latch. Real Postgres, all business reads/writes through the DAL, UI gated by server-resolved manifests.

## Start here

1. [`../STATUS.md`](../STATUS.md) — what to do next (single immediate step).
2. [`decisions/`](./decisions/README.md) — locked choices by domain; do not re-debate in tasks.
3. [`planning/`](./planning/README.md) — **operations backbone** (estimates, site as-built, jobs, PO, billing) — 2026-06-27.
4. [`tasks/20-ui-discovery.md`](./tasks/20-ui-discovery.md) — **active** migration + sites + estimate spike.
4. [`surfaces.md`](./surfaces.md) — Surface & Field catalog (UI/policy contract).
5. [`surface-specs/`](./surface-specs/README.md) — implement-tier specs (task 19 checkpoint + resume).
6. [`surface-planning-depth.md`](./surface-planning-depth.md) — process map + checklist A–K.
7. [`tasks/01-task-index.md`](./tasks/01-task-index.md) — execution order and wave map.

## Reference

| Doc | Contents |
|-----|----------|
| [planning/](./planning/README.md) | Operations backbone — site as-built, estimates, jobs, procurement, billing |
| [schema/current.dbml](./schema/current.dbml) | Full v1 business schema draft (Slices 1–6); [shared diagram](https://dbdiagram.io/d/latch-6a3215ad5c789b8acb9d5278) — see [schema/README.md](./schema/README.md) |
| [surfaces.md](./surfaces.md) | Surface & Field catalog — routes, Fields, waves, open decisions |
| [architecture.md](./architecture.md) | Party spine, tables, entity flow, headline surfaces |
| [routing-and-libraries.md](./routing-and-libraries.md) | Explicit routes, sidebar grouping, app header, SurfaceToolbar overflow, Ant Design / RHF / React Query |
| [child-collections.md](./child-collections.md) | Related records (phones, emails, line items) on a parent Surface |
| [latch-feedback.md](./latch-feedback.md) | Improvements to feed back into `@latch/*` |

## Principles

- **Latch is the security boundary** — handlers orchestrate; DAL enforces manifest. Session gates use `requireAuth` on pages, not `proxy.ts`.
- **No approval workflow** in SubHub v1 — skip verification / pending-change UX.
- **Desktop-first** — Ant Design; mobile is not a design target.
- **Develop SubHub and Latch side by side** — log gaps in `latch-feedback.md`.
- **No backwards compatibility** — rename freely until production users exist.

## Bootstrap (existing app)

See [`../README.md`](../README.md) and the [scaffold runbook](../../../packages/codegen/docs/scaffold-runbook.md).
