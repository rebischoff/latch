# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-20.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** DBML + Field catalog complete. Task **19** paused at **checkpoint** (13/27 specs). **Active:** task **20** — UI discovery.

## Right now — do this next

**[Task 20 — UI discovery](./docs/tasks/20-ui-discovery.md) · Step 2.1 — Surface YAML + codegen + policy registry**

Ship `site_list`, `site_detail`, `site_contact_relation_table` — YAML → codegen → DAL → UI per [`site.md`](./docs/surface-specs/site.md) and [`site-contact-relation.md`](./docs/surface-specs/site-contact-relation.md). Sub-steps: [20-ui-discovery.md § Step 2](./docs/tasks/20-ui-discovery.md#step-2--sites-crm-slice-thin-vertical). **In parallel (optional):** Step 3 estimate line-editor spike on fixtures — see [`spikes/estimate-line-editor.md`](./docs/spikes/estimate-line-editor.md).

**Planning model:** [decision](./docs/decisions/general.md#decision-planning-model--ui-discovery-before-ops-specs-2026-06-20) · **Resume task 19** after Step 4 planning session (start with `estimate.md`, not `item.md`).

## Blockers

None.

## Active slice

| Slice | Focus | State |
|-------|--------|-------|
| [00 — App shell](./docs/tasks/01-task-index.md#slice-00--app-shell) | Layout, nav, auth, IAM | complete |
| [01 — Party / contacts](./docs/tasks/01-task-index.md#slice-01--party--contacts) | Interim `/contacts` | complete (lens refactor in discovery / wave 1b) |
| **Schema** | DBML Slices 2–6 | complete (task 17) |
| **Field catalog** | Fields + waves | complete (task 18) |
| **Surface specs** | Implement-tier docs | **paused** at checkpoint (task 19 — **13/27**); rows #15–28 deferred |
| **UI discovery** | Migration + sites + estimate spike | **active** (task [20](./docs/tasks/20-ui-discovery.md)) |
| [02 — Sites](./docs/tasks/01-task-index.md#task-20--ui-discovery) | Sites CRM slice | **in progress** (step 2) |
| [03–07](./docs/tasks/01-task-index.md) | Catalog → reports | after discovery planning session |

## Recently completed

- **21 — Bundler import convention** — extensionless relative imports; Turbopack default dev; CI `check:imports` guardrail; performance debug logs removed ([`21-bundler-import-convention.md`](./docs/tasks/21-bundler-import-convention.md)) (2026-06-20).
- **Wave 1 migration (`018`–`020`)** — party refactor + site DDL applied in dev; relation catalog dev seed ([`site-migration.md`](./docs/tasks/deferred/site-migration.md)) (2026-06-20).
- **Planning model — UI discovery** — pause task 19 at CRM checkpoint; sites slice + estimate spike before ops specs ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md), [decision](./docs/decisions/general.md#decision-planning-model--ui-discovery-before-ops-specs-2026-06-20)) (2026-06-20).
- **part implement spec** — `profile` (MPN header); `vendor_pricing` Field; one preferred vendor per part ([`part.md`](./docs/surface-specs/part.md)) (2026-06-19).
- **site geography field spec** — `sections`, `locations` on `site_detail` ([`site-geography.md`](./docs/surface-specs/site-geography.md)) (2026-06-19).
- **party addresses field spec** — `addresses` on role detail lenses ([`party-addresses.md`](./docs/surface-specs/party-addresses.md)) (2026-06-19).
- **site + site-contact-relation specs** — [`site.md`](./docs/surface-specs/site.md), [`site-contact-relation.md`](./docs/surface-specs/site-contact-relation.md) (2026-06-19).
- **Party lens specs** — customer, vendor, manufacturer, property owner, employee, contact retire (2026-06-18–19).
- **18 — Surface & Field catalog** — O1–O7 locked; [`surfaces.md`](./docs/surfaces.md) (2026-06-17).

## Pointers

- [Task 20 — UI discovery](./docs/tasks/20-ui-discovery.md) · [Spikes](./docs/spikes/README.md)
- [Schema DBML](./docs/schema/current.dbml) · [Site migration spec](./docs/tasks/deferred/site-migration.md)
- [Decisions](./docs/decisions/README.md) · [Surface catalog](./docs/surfaces.md) · [Surface specs](./docs/surface-specs/README.md)
- [Architecture](./docs/architecture.md) · [Tasks](./docs/tasks/01-task-index.md)
