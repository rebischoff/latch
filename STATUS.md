# STATUS — what's next

> **The "quarterback" file.** When in doubt, start here. Always read this first.
> This is the **global pointer**: it names the **active phase**. Detailed, per-phase status lives in each phase's own `STATUS.md`.
> Updated: 2026-06-02 (Phase 05 active).

---

## Project at a glance

- **Name:** **Latch** — see [naming](./docs/foundations/naming.md).
- **Phase model:** delivery is sliced into self-contained phases under [`docs/phases/`](./docs/phases/README.md). Phases are **sequenced but re-orderable** (change-order tolerant).
- **Goal of v1:** Field-level access-control on Postgres with UI/backend sync, proven by a trades-CRM sample app.
- **Solo dev. Single company. Internal use first.**

---

## Active phase

### → Phase 05 — Verification (accept/reject, pending store)

| | |
|---|---|
| **Plan** | [`docs/phases/05-verification/README.md`](./docs/phases/05-verification/README.md) |
| **Phase STATUS** | [`docs/phases/05-verification/STATUS.md`](./docs/phases/05-verification/STATUS.md) |
| **Focus** | Persist `latch_pending_changes`; metadata-driven verification gates; reviewer accept/reject + audit (`approve`). |
| **Do next** | [`docs/phases/05-verification/README.md`](./docs/phases/05-verification/README.md) — definition of done and sub-goals; in-memory pending store is the starting gap. |

> **Phase 04 (Audit & lifecycle) complete (2026-06-02)** — T6 immutability + T16 delete audit in CI; hard delete + CASCADE snapshots; `restoreFromAuditEntry` + e2e restore; retention seam. See [`docs/phases/04-audit-lifecycle/STATUS.md`](./docs/phases/04-audit-lifecycle/STATUS.md).

> **Phase 03 (Identity & IAM) complete (2026-06-02)** — `latch_user_roles` + DB-backed `getPrincipal`; Auth.js wired; `user_roles_detail` IAM API (assign/revoke, audited); threat T8 (route 404 hide + positive) and `data_master` auto-access regression in CI. See [`docs/phases/03-identity-iam/STATUS.md`](./docs/phases/03-identity-iam/STATUS.md).

> **Phase 02 (UI sync) complete (2026-06-02)** — `customer_detail` Surface + CRM page; cross-Surface link; nav minimal scope; threat T14 + customer T2 in CI. See [`docs/phases/02-ui-sync/STATUS.md`](./docs/phases/02-ui-sync/STATUS.md).

> **Phase 02b (Platform extraction) complete (2026-06-02)** — `@latch/*` domain-agnostic; `apps/crm` sole consumer; `apps/web` retired. See [`docs/phases/02b-platform-extraction/STATUS.md`](./docs/phases/02b-platform-extraction/STATUS.md).

> **Phase 01 (Data access) complete** — `job_list` list + bulk proven end-to-end; threat T2 (list) + T15 in CI. See [`docs/phases/01-data-access/STATUS.md`](./docs/phases/01-data-access/STATUS.md).

To switch focus (a "change order"), re-point this section at another phase folder — no other file needs rewriting. See [how phases work](./docs/phases/README.md).

> **CRM harness trails the active phase** — it has no separate active item. Slice checklist: [`apps/crm/docs/TASKS.md`](./apps/crm/docs/TASKS.md); timing: [`docs/reference/crm-and-phases.md`](./docs/reference/crm-and-phases.md).
>
> **Planning gate:** when any implementation task hits an unplanned fork, stop and plan before coding — see [`docs/phases/README.md`](./docs/phases/README.md#planning-gate-stop-and-plan-rule).

---

## Phase board

| Phase | Capability | State |
|-------|-----------|-------|
| [00 Foundation](./docs/phases/00-foundation/STATUS.md) | contracts, policy, codegen, single-record DAL | mostly done |
| [01 Data access](./docs/phases/01-data-access/STATUS.md) | list, projection, bulk (`job_list`) | complete |
| [02b Platform extraction](./docs/phases/02b-platform-extraction/STATUS.md) | genericize `@latch/*`; retire `apps/web` | complete |
| [02 UI sync](./docs/phases/02-ui-sync/STATUS.md) | `<Can>`/`<FieldControl>`, `customer_detail` | complete |
| [03 Identity & IAM](./docs/phases/03-identity-iam/STATUS.md) | users/roles in DB, IAM + Data master, auth | complete |
| [04 Audit & lifecycle](./docs/phases/04-audit-lifecycle/STATUS.md) | full audit, hard delete + recovery | complete |
| **[05 Verification](./docs/phases/05-verification/STATUS.md)** | accept/reject, verification gates | **active** (partial) |
| [06 Performance & safety](./docs/phases/06-performance-safety/STATUS.md) | manifest cache, RLS surface-gate | not started |
| [07 Scale-out](./docs/phases/07-scale-out/STATUS.md) | multi-company, publish packages | deferred |

---

## Health checks

| Area | State |
|---|---|
| Docs | Reorganized into `foundations` / `reference` / `phases` / `discovery` / `archive` (2026-05-29) |
| Code | `job_detail` + `customer_detail` stacks proven end-to-end in `apps/crm` |
| Tests | `npm run test` — contracts, policy, dal, audit, e2e, threat |
| CI | GitHub Actions on `main` PRs |

---

## Pointers

- Phases (the roadmap): [`docs/phases/README.md`](./docs/phases/README.md)
- Docs map: [`docs/README.md`](./docs/README.md)
- Scope: [`docs/foundations/scope.md`](./docs/foundations/scope.md)
- Invariants: [`.cursor/rules/10-invariants.mdc`](./.cursor/rules/10-invariants.mdc)
- Pilot archive: [`docs/archive/`](./docs/archive/)
