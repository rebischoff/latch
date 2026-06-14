# SubHub documentation

End-to-end **service-trades / AV integration** business app on Latch. Real Postgres, all business reads/writes through the DAL, UI gated by server-resolved manifests.

## Start here

1. [`../STATUS.md`](../STATUS.md) — what to do next (single immediate step).
2. [`decisions.md`](./decisions.md) — locked choices; do not re-debate in tasks.
3. [`tasks/01-task-index.md`](./tasks/01-task-index.md) — execution order and slice map.

## Reference

| Doc | Contents |
|-----|----------|
| [architecture.md](./architecture.md) | Party spine, tables, surfaces, delivery slices |
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
