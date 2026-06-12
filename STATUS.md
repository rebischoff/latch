# STATUS — what's next

> **The "quarterback" file.** When in doubt, start here. Always read this first.
> This is the **global pointer**: it names the **active phase**. Detailed, per-phase status lives in each phase's own `STATUS.md`.
> Updated: 2026-06-11 (Phase 09 complete; **Phase 07 — scale-out** remains deferred until a real driver).

---

## Project at a glance

- **Name:** **Latch** — see [naming](./packages/docs/foundations/naming.md).
- **Phase model:** delivery is sliced into self-contained phases under [`docs/phases/`](./packages/docs/phases/README.md). Phases are **sequenced but re-orderable** (change-order tolerant).
- **Goal of v1:** Field-level access-control on Postgres with UI/backend sync, proven by a trades-CRM sample app.
- **Solo dev. Single company. Internal use first.**
- **Platform snapshot:** [`docs/reference/platform-status.md`](./packages/docs/reference/platform-status.md) — package-by-package standing.

---

## Active phase

**No active implementation phase** — v1 platform packaging slice is complete (Phase 09 closed 2026-06-11). Consumer apps: scaffold via `npm run latch:new -- <name>`; trades-CRM domain fixtures in [`fixtures/crm-proof/`](./fixtures/crm-proof/). Pull **[Phase 07 — Scale-out](./packages/_docs/phases/07-scale-out/README.md)** when a second company, second app, or external `@latch/*` consumer appears.

| | |
|---|---|
| **Last completed** | [Phase 09 — Platform packaging](./packages/_docs/phases/09-platform-packaging/README.md) ([STATUS](./packages/_docs/phases/09-platform-packaging/STATUS.md)) |
| **Deliverable** | `@latch/*` adapters + `app-kit`; template zero glue; scaffold proof (domain in `fixtures/crm-proof/`) |
| **Deferred next** | [Phase 07 — Scale-out](./packages/_docs/phases/07-scale-out/README.md) — publish, multi-company, native RLS |

Phases 00–06, 08, and 09 are complete for the current v1 scope slice.

> **Planning gate:** when any implementation task hits an unplanned fork, stop and plan before coding — see [`docs/phases/README.md`](./packages/docs/phases/README.md#planning-gate-stop-and-plan-rule).

---

## Phase 07 — Scale-out — **deferred**

| | |
|---|---|
| **Plan** | [`docs/phases/07-scale-out/README.md`](./packages/docs/phases/07-scale-out/README.md) |
| **Phase STATUS** | [`docs/phases/07-scale-out/STATUS.md`](./packages/docs/phases/07-scale-out/STATUS.md) |
| **Focus** | Company routing, Postgres job store, **native** RLS spikes/adoption, business-table audit triggers, `@latch/*` publish. |
| **Do next** | Not scheduled. Pull when a real driver appears (second company, second app, or external package consumer). |

---

## Phase board

| Phase | Capability | State |
|-------|-----------|-------|
| [00 Foundation](./packages/_docs/phases/00-foundation/STATUS.md) | contracts, policy, codegen, single-record DAL | complete (policy task 05 closed 2026-06-10) |
| [01 Data access](./packages/_docs/phases/01-data-access/STATUS.md) | list, projection, bulk (`job_list`) | complete |
| [02b Platform extraction](./packages/_docs/phases/02b-platform-extraction/STATUS.md) | genericize `@latch/*`; retire `apps/web` | complete |
| [02 UI sync](./packages/_docs/phases/02-ui-sync/STATUS.md) | `<Can>`/`<FieldControl>`, `customer_detail` | complete |
| [03 Identity & IAM](./packages/_docs/phases/03-identity-iam/STATUS.md) | users/roles in DB, IAM + Data master, auth | complete |
| [04 Audit & lifecycle](./packages/_docs/phases/04-audit-lifecycle/STATUS.md) | full audit, hard delete + recovery | complete |
| [05 Verification](./packages/_docs/phases/05-verification/STATUS.md) | accept/reject, verification gates | complete |
| [06 Performance & safety](./packages/_docs/phases/06-performance-safety/STATUS.md) | manifest cache, T5/T12 connection safety | complete |
| [08 Scoped access](./packages/_docs/phases/08-scoped-access/STATUS.md) | `scopeIds` resolve + DAL filter + business harness proof | complete (2026-06-10) |
| [09 Platform packaging](./packages/_docs/phases/09-platform-packaging/STATUS.md) | extract reference adapters; template zero-glue; scaffold proof | complete (2026-06-11) |
| [07 Scale-out](./packages/_docs/phases/07-scale-out/STATUS.md) | multi-company, native RLS, Postgres job store, publish | **deferred** |

---

## Health checks

| Area | State |
|---|---|
| Docs | Phase 08 closed; platform-status updated (2026-06-10) |
| Code | Phase 09 complete; packages + template; consumer apps via `latch new` |
| Tests | `npm run test` — contracts, policy, dal, audit, e2e, threat, performance-safety, scoped visibility |
| CI | GitHub Actions on `main` PRs |

---

## Pointers

- **Platform standing:** [`docs/reference/platform-status.md`](./packages/docs/reference/platform-status.md)
- Phases (the roadmap): [`docs/phases/README.md`](./packages/docs/phases/README.md)
- Policy tasks: [`packages/policy/docs/tasks/README.md`](./packages/policy/docs/tasks/README.md)
- Docs map: [`docs/README.md`](./packages/docs/README.md)
- Scope: [`docs/foundations/scope.md`](./packages/docs/foundations/scope.md)
- Invariants: [`.cursor/rules/10-invariants.mdc`](.cursor/rules/10-invariants.mdc)
- Pilot archive: [`docs/archive/`](./docs/archive)
