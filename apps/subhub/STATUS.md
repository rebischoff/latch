# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-19.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** DBML + Field catalog complete. **Surface implement specs (task 19)** — full v1 DAL/UI planning before code.

## Right now — do this next

**Task 19 — Surface implement specs** — one-by-one DAL/policy/UI specs per [`surface-specs/00-scan.md`](./docs/surface-specs/00-scan.md). **Next: #14 [`part.md`](./docs/surface-specs/part.md)**. Progress: **12/27** spec files ([`site-geography.md`](./docs/surface-specs/site-geography.md) ✅ — `parent_site`, `physical_address`, `sections`, `locations` on `site_detail`).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| [00 — App shell](./docs/tasks/01-task-index.md#slice-00--app-shell) | Layout, nav, auth, IAM surfaces | complete (tasks 04–09) |
| [01 — Party / contacts](./docs/tasks/01-task-index.md#slice-01--party--contacts) | `party` model, phones/emails, subsets | **complete** (tasks 10–14) |
| **Schema** | DBML Slices 2–6 | **complete** (task [17](./docs/tasks/17-schema-design-pass.md)) |
| **Field catalog** | Fields + waves | **complete** (task [18](./docs/tasks/18-surface-catalog.md)) |
| **Surface specs** | DAL + UI + policy per Surface | **active** (task [19](./docs/tasks/19-surface-implement-specs.md)) — **12/27** |
| [02 — Sites](./docs/tasks/01-task-index.md#wave-1--sites-party-refactor-migration) | Sites, party refactor | **blocked** until task 19 |
| [03–07](./docs/tasks/01-task-index.md) | Catalog → reports | planned (DBML drafted) |

## Recently completed

- **site geography field spec** — `parent_site`, `physical_address`, `sections`, `locations` on `site_detail`; default `active` on admin add; tombstone + relocate rules ([`site-geography.md`](./docs/surface-specs/site-geography.md), [`decisions/site.md`](./docs/decisions/site.md)) (2026-06-19).
- **party addresses field spec** — `addresses` on customer/vendor/manufacturer/property_owner detail; replace-array; copy-on-write shared `address` spine; orphan GC ([`party-addresses.md`](./docs/surface-specs/party-addresses.md), [`decisions/site.md`](./docs/decisions/site.md)) (2026-06-19).
- **site contact relation catalog spec** — `site_contact_relation_table` editable page; per-row POST/PATCH/DELETE; `ConflictError` when `site_contact` references row ([`site-contact-relation.md`](./docs/surface-specs/site-contact-relation.md)) (2026-06-19).
- **site implement spec** — forks 1–9 locked (portfolio, create, delete A+, contacts, list, layout, policy, cross-nav, orphans) ([`site.md`](./docs/surface-specs/site.md), [`decisions/site.md`](./docs/decisions/site.md)) (2026-06-19).
- **contact retire spec** — remove `contact_list` / `contact_detail` / `/contacts`; five type lens prerequisites; `/contacts/[id]` compat redirect ([`contact-retire.md`](./docs/surface-specs/contact-retire.md), [party lens decision](./docs/decisions/party.md)) (2026-06-19).
- **employee implement spec** — person-only base lens; HR + costing deferred; `default_labor_class_id` documented for costing slice; `add_as_db_user` ([`employee.md`](./docs/surface-specs/employee.md), [`decisions/party.md`](./docs/decisions/party.md)) (2026-06-19).
- **property owner implement spec** — org hub: subsidiaries, contacts, `related_sites`; `site.property_owner_party_id`; person owners allowed ([`property-owner.md`](./docs/surface-specs/property-owner.md), [`decisions/party.md`](./docs/decisions/party.md), [`decisions/site.md`](./docs/decisions/site.md)) (2026-06-18).
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
