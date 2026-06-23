# STATUS — SubHub

> App-local quarterback. Platform pointer: [`../../STATUS.md`](../../STATUS.md).
> Updated: 2026-06-22.

- **Package:** `@latch/subhub` · **Port:** 3003
- **Docs:** [`docs/README.md`](./docs/README.md) · **Tasks:** [`docs/tasks/01-task-index.md`](./docs/tasks/01-task-index.md)
- **State:** DBML + Field catalog complete. Task **19** paused at **checkpoint** (13/27 specs). **Active:** task **20** — UI discovery (Step 4).

## Right now — do this next

**[Task 20 — UI discovery](./docs/tasks/20-ui-discovery.md) · Step 4 — Planning session**

Review the estimate line-editor spike at [`/estimates/demo`](http://localhost:3003/estimates/demo) (dev only). Lock flat vs grouped default, geography timing, kits, and task 19 resume order. Spike notes: [`docs/spikes/estimate-line-editor.md`](./docs/spikes/estimate-line-editor.md).

**Planning model:** [decision](./docs/decisions/general.md#decision-planning-model--ui-discovery-before-ops-specs-2026-06-20) · **Resume task 19** after Step 4 (start with `estimate.md`, not `item.md`).

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
| **UI discovery** | Migration + sites + estimate spike | **active** (task [20](./docs/tasks/20-ui-discovery.md)) — step 3 complete |
| [02 — Sites](./docs/tasks/01-task-index.md#task-20--ui-discovery) | Sites CRM slice | **complete** (step 2.10, 2026-06-22) |
| [03–07](./docs/tasks/01-task-index.md) | Catalog → reports | after discovery planning session |

## Recently completed

- **Step 3 — Estimate UI spike** — `/estimates/demo` fixture line editor (flat + grouped-by-location, kits, labor phase, static part picker); spike notes [`estimate-line-editor.md`](./docs/spikes/estimate-line-editor.md) ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.10 — Step 2 stop gate** — Sites CRM slice exit confirmed: CRUD sites + standing contacts, Sites nav group, manifest-narrowed DAL/UI, site delete blockers (`estimate`/`job`/`child_site`), relation catalog `InUseError`; `codegen:check` passes; spec verify rows updated ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md), [`site.md`](./docs/surface-specs/site.md)) (2026-06-22).
- **Step 2.9 — Relation catalog UI** — `/contact-relations` editable table (`CatalogTableSurface` + `SiteContactRelationCatalog`); Save/Revert + drag reorder; `PATCH { rows }` replace-array; site detail relation pickers + empty-catalog CTA wired ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.8 — Contacts collection UI** — `SiteContactFields` on `SiteDetailForm` (`FieldArrayTable`, party `role=any` picker, relation catalog dropdown, empty-catalog CTA, quick-create person modal, duplicate inline validation); contacts replace-array on Save ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.7 — Site UI shell** — master-detail `/sites` with prefetch; `SiteList` (New → `?create=1` POST); `SiteDetailForm` profile + portfolio pickers (`/api/sites/pickers/parties`), hub links, `SurfaceFormRoot` loading ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.6 — Nav + routes** — `routes.sites`, **Sites** sidebar group (`site_list`, `site_contact_relation_table`); longest-prefix highlight for `/sites/[id]` vs `/contact-relations` ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.5 — Site API routes + `surface-api` wiring** — `GET /api/sites`, `GET`/`PATCH`/`POST`/`DELETE /api/sites/[id]` via shared surface loaders; `postSurfaceDetail` client helper; DELETE uses `withSubhubApiHandler` for `InUseError` blockers ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.4 — Site DAL write + delete** — `site_detail` create/patch/delete through `lib/sites/`; portfolio FK validation (customer org + tags); `contacts` replace-array; hard delete with `InUseError` blockers for estimate/job/child_site ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.3 — Site DAL read path** — `site_list` list/search and `site_detail` get through `lib/sites/`; profile + portfolio party labels + standing contacts projected per manifest; shared surface loaders registered ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.2 — Relation catalog DAL + API** — `lib/sites/` CRUD on `site_contact_relation`; `GET`/`POST /api/sites/contact-relations`, `PATCH`/`DELETE …/[id]`; `InUseError` delete blocker ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
- **Step 2.1 — Site Surface YAML + codegen** — `site_list`, `site_detail`, `site_contact_relation_table` YAML + policy registry; `codegen:check` passes ([`20-ui-discovery.md`](./docs/tasks/20-ui-discovery.md)) (2026-06-22).
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

- [Task 20 — UI discovery](./docs/tasks/20-ui-discovery.md) · [Spikes](./docs/spikes/README.md) · [Estimate spike](./docs/spikes/estimate-line-editor.md)
- [Schema DBML](./docs/schema/current.dbml) · [Site migration spec](./docs/tasks/deferred/site-migration.md)
- [Decisions](./docs/decisions/README.md) · [Surface catalog](./docs/surfaces.md) · [Surface specs](./docs/surface-specs/README.md)
- [Architecture](./docs/architecture.md) · [Tasks](./docs/tasks/01-task-index.md)
