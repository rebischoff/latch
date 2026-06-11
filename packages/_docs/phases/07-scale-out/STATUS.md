# STATUS — Phase 07 Scale-out

> Phase-local quarterback. Global pointer: [`STATUS.md`](../../../../STATUS.md).
> Updated: 2026-06-10.

- **Home:** cross-cutting
- **State:** deferred — active work is [Phase 08 Scoped access](../08-scoped-access/STATUS.md) (DAL scoped row filter; closes `@latch/policy`)

## Right now — do this next

Not active and not scheduled. Pull items here when a real driver appears (a second company, a second app, or an external consumer of `@latch/*`). **Note:** Phase 08 implements DAL-scoped row filtering; **native Postgres RLS** spikes remain here.

> **Named driver (2026-06-06):** business apps will eventually be built **outside this monorepo** and import Latch as a published SDK + CLI. Until that's live, internal/dev apps stay in-repo as `apps/*`. Target model + sync-vs-scaffold split: [`../../discussions/01-codegen.md`](../../discussions/01-codegen.md#decision-latch-is-an-installable-sdk--cli-monorepo-apps-are-dev-only-2026-06-06). Cheap design step to keep the option open: codegen scan root must resolve from cwd/config, not `import.meta.url`.

Phase 06 delivered manifest cache + T5/T12; RLS spikes, Postgres job store, and business-table audit triggers are scoped here — see [`README.md`](./README.md) and [`../06-performance-safety/decisions.md`](../06-performance-safety/decisions.md).

## Blockers

None — intentionally parked.

## Recently completed

- Per-request DB client seam exists (single `DATABASE_URL` hard-coded), so multi-company is a future config swap.
