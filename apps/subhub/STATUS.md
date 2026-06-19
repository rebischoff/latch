# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-18.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** DBML + Field catalog complete. **Surface implement specs (task 19)** — full v1 DAL/UI planning before code.

## Right now — do this next

**Task 19 — Surface implement specs** — one-by-one DAL/policy/UI specs per [`surface-specs/00-scan.md`](./docs/surface-specs/00-scan.md). **Next: #7 [`property-owner.md`](./docs/surface-specs/property-owner.md)**. Progress: **5/27** spec files ([`iam-user.md`](./docs/surface-specs/iam-user.md) incl. `role_assignments`, [`iam-role.md`](./docs/surface-specs/iam-role.md), [`customer.md`](./docs/surface-specs/customer.md), [`vendor.md`](./docs/surface-specs/vendor.md), [`manufacturer.md`](./docs/surface-specs/manufacturer.md) ✅).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| [00 — App shell](./docs/tasks/01-task-index.md#slice-00--app-shell) | Layout, nav, auth, IAM surfaces | complete (tasks 04–09) |
| [01 — Party / contacts](./docs/tasks/01-task-index.md#slice-01--party--contacts) | `party` model, phones/emails, subsets | **complete** (tasks 10–14) |
| **Schema** | DBML Slices 2–6 | **complete** (task [17](./docs/tasks/17-schema-design-pass.md)) |
| **Field catalog** | Fields + waves | **complete** (task [18](./docs/tasks/18-surface-catalog.md)) |
| **Surface specs** | DAL + UI + policy per Surface | **active** (task [19](./docs/tasks/19-surface-implement-specs.md)) — **5/27** |
| [02 — Sites](./docs/tasks/01-task-index.md#wave-1--sites-party-refactor-migration) | Sites, party refactor | **blocked** until task 19 |
| [03–07](./docs/tasks/01-task-index.md) | Catalog → reports | planned (DBML drafted) |

## Recently completed

- **manufacturer implement spec** — base lens only; no hub, no related UI, no sub-manufacturers ([`manufacturer.md`](./docs/surface-specs/manufacturer.md), [`decisions/party.md`](./docs/decisions/party.md)) (2026-06-18).
- **`role_assignments` merged into iam-user** — cancelled `iam-user-roles.md` row; v1 flat picker, all roles; `scope_id` on assignment deferred ([`iam-user.md`](./docs/surface-specs/iam-user.md), [`decisions/iam.md`](./docs/decisions/iam.md)) (2026-06-18).
- **vendor implement spec** — org hub: subsidiaries, contacts, POs; no sites; `parent_vendor` ([`vendor.md`](./docs/surface-specs/vendor.md), [`decisions/party.md`](./docs/decisions/party.md)) (2026-06-18).
- **iam-role implement spec** — role catalog + grant matrix; IAM decisions ([`iam-role.md`](./docs/surface-specs/iam-role.md), [`decisions/iam.md`](./docs/decisions/iam.md)) (2026-06-18).
- **iam-user implement spec** — target model; shipped code interim ([`iam-user.md`](./docs/surface-specs/iam-user.md)) (2026-06-18).
- **Party identity model** — `party_person` login link; `login_email` app sync from `party_email.is_login_email` ([`decisions/party.md`](./docs/decisions/party.md#decision-login-email--app-sync-to-latch_userslogin_email-2026-06-18)) (2026-06-18).
- **18 — Surface & Field catalog** — O1–O7 locked; [`surfaces.md`](./docs/surfaces.md); decisions in [`decisions/`](./docs/decisions/README.md) (2026-06-17).
- **Planning model clarified** — task 19 + [`surface-specs/`](./docs/surface-specs/README.md) for full v1 implement depth before code (2026-06-17).

## Pointers

- [Schema DBML](./docs/schema/current.dbml) · [Schema workflow](./docs/schema/README.md)
- [Decisions](./docs/decisions/README.md) · [Surface catalog](./docs/surfaces.md) · [Surface specs](./docs/surface-specs/README.md)
- [Architecture](./docs/architecture.md) · [Child collections](./docs/child-collections.md)
- [Tasks](./docs/tasks/01-task-index.md) · [Scaffold runbook](../../packages/codegen/docs/scaffold-runbook.md)
