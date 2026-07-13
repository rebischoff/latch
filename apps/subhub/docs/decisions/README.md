# SubHub — decisions index

> Lock choices here before implementation tasks. Add dated **Decision** blocks to the appropriate domain file — not in task files.

## Open

| Fork | Doc | Notes |
|------|-----|--------|
| _(none — Y1–Y5 locked)_ | [estimate.md](./estimate.md#decision-condition-only-commercial-tree-2026-07-09) | Implement [37y](../tasks/37y-condition-only-commercial-tree.md). |

_Operations backbone forks **resolved** (2026-06-27). Optional: [J3 phase weights](../planning/07-open-decisions.md#J3)._

## Operations backbone planning (2026-06-27)

| Doc | Scope |
|-----|--------|
| [planning/README.md](../planning/README.md) | Index |
| [00-backbone.md](../planning/00-backbone.md) | Spine, separations, flows |
| [01-site-as-built.md](../planning/01-site-as-built.md) | System, area tree, asset |
| [02-estimates.md](../planning/02-estimates.md) | Assumptions, lines, win |
| [03-jobs-progress.md](../planning/03-jobs-progress.md) | Scope, progress, CO, as-built |
| [04-procurement.md](../planning/04-procurement.md) | PO, lead time |
| [05-billing.md](../planning/05-billing.md) | SOV, billable |
| [06-catalog-trade-system.md](../planning/06-catalog-trade-system.md) | Trade, system, tags |
| [07-open-decisions.md](../planning/07-open-decisions.md) | Open forks + glossary |
| [08-supersedes.md](../planning/08-supersedes.md) | Prior decisions amended |
| [09-migration-notes.md](../planning/09-migration-notes.md) | DBML / migration order |
| [11-categories-scope-model.md](../planning/11-categories-scope-model.md) | Category roots replace catalog `system` |
| [12-master-detail-chrome.md](../planning/12-master-detail-chrome.md) | Shared toolbar + create navigation (2026-07-01) |

## Domain files

| File | Scope |
|------|--------|
| [general.md](./general.md) | App shell, auth, nav, routes, schema-first, Surface patterns |
| [iam.md](./iam.md) | Role catalog, grant matrix v2, IAM routes, assignment guards |
| [party.md](./party.md) | Party spine, type lenses, profile, identity, employee |
| [site.md](./site.md) | Sites, addresses, geography, standing contacts |
| [estimate.md](./estimate.md) | Estimates and quote line grouping |
| [job.md](./job.md) | Jobs, field status, change orders, job UI |
| [catalog.md](./catalog.md) | Parts, items, categories, labor phases |
| [procurement.md](./procurement.md) | Requisitions, POs, receipts, inventory |
| [billing.md](./billing.md) | Billable staging, invoices, SOV |
| [cross-cutting.md](./cross-cutting.md) | Notes, attachments, seeding, progressive setup |

## All decisions (by date)

| Decision | File | Date | Status |
|----------|------|------|--------|
| Spec participation removed — namespace narrowing + part-row presence (V1–V8) | [catalog.md](./catalog.md) | 2026-07-12 | **locked** ([37ai](../tasks/37ai-spec-participation-removal.md)) |
| Spec threshold presets + numeric bucket ranges (A1–T10) | [catalog.md](./catalog.md) | 2026-07-12 | **locked** ([37ae](../tasks/37ae-spec-threshold-presets-ddl.md) → [37ah](../tasks/37ah-spec-threshold-presets-estimate-ui.md)) |
| Labor phase per-row override — merge across full ancestry | [catalog.md](./catalog.md) | 2026-07-12 | **locked** ([37ad](../tasks/37ad-labor-phase-per-row-override.md)) |
| Deferred — cross-spec dependency and derived specs | [catalog.md](./catalog.md) | 2026-07-11 | **deferred** |
| `slc_protocol` naming — rename + explicit `none`/`conventional` option | [catalog.md](./catalog.md) | 2026-07-11 | planning (no task) |
| Enum / numeric threshold presets (2026-07-11 proposals) | [catalog.md](./catalog.md) | 2026-07-11 | **superseded** by 2026-07-12 locked decision |
| Item placement + mount axis override — reverted, leaf duplication instead (R1–R6) | [catalog.md](./catalog.md) | 2026-07-11 | **locked** ([37ac](../tasks/37ac-item-placement-mount-axis-revert.md)) |
| Item placement — multi-location browse tree, decoupled from cost resolution (L1–L6) | [catalog.md](./catalog.md) | 2026-07-11 | **superseded** ([37ac](../tasks/37ac-item-placement-mount-axis-revert.md)) |
| Item labor axis override — single-spec axis, no compound (M1–M7, M7 = margin FK extension) | [catalog.md](./catalog.md) | 2026-07-11 | **superseded** ([37ac](../tasks/37ac-item-placement-mount-axis-revert.md)) |
| Condition-only commercial tree (Y1–Y5) | [estimate.md](./estimate.md) | 2026-07-09 | **locked** ([37y](../tasks/37y-condition-only-commercial-tree.md)) |
| Estimate scope / condition / zone / line qty (G1–G5e) | [estimate.md](./estimate.md) | 2026-07-09 | **locked** · **amended by Y1–Y5** ([37x](../tasks/37x-estimate-conditions-allocations.md)) |
| Part item links leaf-only + Specs value UX | [catalog.md](./catalog.md) | 2026-07-08 | **locked** ([37u](../tasks/37u-part-leaf-links-specs-ui.md)) |
| Numeric specs — drop `range` type; band is part-authored | [catalog.md](./catalog.md) | 2026-07-08 | **locked** ([37s](../tasks/37s-spec-defs-ui-drop-range.md)) |
| Spec value types, units table, and locks | [catalog.md](./catalog.md) | 2026-07-08 | **amended** ([37s](../tasks/37s-spec-defs-ui-drop-range.md); was 37p → 37q → 37r) |
| Spec definitions scoped to root, flat item participation | [catalog.md](./catalog.md) | 2026-07-07 | **partially superseded** (participation dropped 2026-07-12, [37ai](../tasks/37ai-spec-participation-removal.md); namespace/scope-root clauses still locked, [37o](../tasks/37o-spec-participation-flatten.md)) |
| Labor phase inclusion — catalog → estimate → job | [catalog.md](./catalog.md) | 2026-07-07 | **locked** ([37n](../tasks/37n-labor-phase-inclusion.md)) |
| Catalog part authoring UI — `item_links` + `part_specs` on `part_detail` | [catalog.md](./catalog.md) | 2026-07-06 | **locked** ([37j](../tasks/37j-catalog-part-authoring.md)) |
| Line item part pin — `item_id`, `part_id`, `part_locked` | [37f](../tasks/37f-estimate-line-costing.md) | 2026-07-04 | **locked** |
| Ambiguous part material cost — fallback + max vendor | [37f](../tasks/37f-estimate-line-costing.md) | 2026-07-04 | **locked** |
| Commercial costing — org tables, category defaults, estimate overrides | [catalog.md](./catalog.md) | 2026-07-04 | **locked** |
| Estimate scope required + pricing overrides | [estimate.md](./estimate.md) | 2026-07-04 | **locked** |
| `spec_def` value types and part-matching rules | [catalog.md](./catalog.md) | 2026-07-02 | **amended** 2026-07-08 ([units + number/range](./catalog.md#decision-spec-value-types-units-table-and-locks-2026-07-08)) |
| Category spec participation — inherit, include, exclude | [catalog.md](./catalog.md) | 2026-07-02 | **locked** (37d amend + migration) |
| Category-only scope — roots replace catalog `system` | [catalog.md](./catalog.md) | 2026-06-30 | **locked** |
| Estimate scope — checkbox site tree, item-first lines | [estimate.md](./estimate.md) | 2026-06-30 | **locked** |
| Site scopes & zones — category root instances | [site.md](./site.md) | 2026-06-30 | **locked** |
| Site geography UI — systems & areas tree table | [site.md](./site.md) | 2026-06-30 | **locked** |
| Estimate site anchor — gate lines, immutable after create | [estimate.md](./estimate.md) | 2026-06-30 | **locked** |
| System specs + part compatibility (C2) | [catalog.md](./catalog.md) | 2026-06-27 | **locked** |
| Location confidence — defer v1 (E4) | [estimate.md](./estimate.md) | 2026-06-27 | **locked** |
| Estimate — estimate_system tabs | [estimate.md](./estimate.md) | 2026-06-27 | **locked** |
| Site as-built — system, area tree, asset | [site.md](./site.md) | 2026-06-27 | planning |
| As-built publish on job complete (A2) | [job.md](./job.md), [site.md](./site.md) | 2026-06-27 | **locked** |
| Progress entry — no workflow (J2) | [job.md](./job.md) | 2026-06-27 | **locked** |
| Phase templates — per system default (J5) | [catalog.md](./catalog.md) | 2026-06-27 | **superseded** ([37n](../tasks/37n-labor-phase-inclusion.md)) |
| Job scope group — implicit General (J4) | [job.md](./job.md) | 2026-06-27 | **locked** |
| Field progress — scope phase + progress entries (J1) | [job.md](./job.md) | 2026-06-27 | **locked** |
| Job scope, progress model | [job.md](./job.md) | 2026-06-27 | planning |
| Install target — manual scope_phase.target_date (P2) | [procurement.md](./procurement.md) | 2026-06-27 | **locked** |
| Procurement — lead time, ad-hoc PO | [procurement.md](./procurement.md) | 2026-06-27 | planning |
| Auto billable — manual staging v1 (B4) | [billing.md](./billing.md) | 2026-06-27 | **locked** |
| Billing — scope phase rollups, SOV to scope groups | [billing.md](./billing.md) | 2026-06-27 | planning |
| Bundler monorepo — extensionless relative imports | [general.md](./general.md) | 2026-06-20 | active (rollout task 21) |
| Planning model — UI discovery before ops specs | [general.md](./general.md) | 2026-06-20 | active |
| `part_detail` — MPN catalog and vendor pricing | [catalog.md](./catalog.md) | 2026-06-19 | active |
| picker return context — URL protocol | [general.md](./general.md) | 2026-06-24 | active |
| picker return on SurfaceFormRoot — merge selectedId into defaults | [general.md](./general.md) | 2026-06-24 | active |
| list+detail Surface create — toolbar and picker add-new | [general.md](./general.md) | 2026-06-19 | active (amended 2026-07-01) |
| Surface create route — `/new` + DB-assigned id | [general.md](./general.md) | 2026-06-25 | active (retrofit task 27) |
| linked picker control (`LinkedSelectInput`) | [general.md](./general.md) | 2026-06-24 | active |
| picker navigate away — dirty form confirm (v1) | [general.md](./general.md) | 2026-06-24 | active |
| grant authoring model v2 (platform target) | [iam.md](./iam.md) | 2026-06-18 | active (impl deferred) |
| delete blocked by referential use — structured errors | [cross-cutting.md](./cross-cutting.md) | 2026-06-18 | active (impl deferred) |
| IAM role catalog — app CRUD, system cosmetic edit | [iam.md](./iam.md) | 2026-06-18 | active |
| IAM role editor — allow-only grants | [iam.md](./iam.md) | 2026-06-18 | active |
| IAM role create — list POST + New toolbar | [iam.md](./iam.md) | 2026-06-18 | active (impl task 26) |
| IAM role detail UI — grant matrix app-only | [iam.md](./iam.md) | 2026-06-18 | active |
| IAM routes — `/roles`, `/users` | [iam.md](./iam.md) | 2026-06-18 | active |
| IAM assignment self-patch — platform rule, IAM DAL | [iam.md](./iam.md) | 2026-06-18 | active |
| SQL-first persistence | [general.md](./general.md) | inherits platform 2026-06-11 | active |
| employee HR fields | [party.md](./party.md) | 2026-06-16, deferred | active |
| notes and attachments — shared tables | [cross-cutting.md](./cross-cutting.md) | 2026-06-15, deferred, **amended 2026-06-17** | active |
| employee wave 0 — implementation | [party.md](./party.md) | 2026-06-25 | shipped (task 28) |
| provision app user from person surface | [party.md](./party.md) | 2026-06-25 | shipped (task 28) |
| provision user return context | [general.md](./general.md) | 2026-06-25 | shipped (task 28) |
| party identity — `party_person` login link | [party.md](./party.md) | 2026-06-18 | active |
| login email — app sync to `latch_users.login_email` | [party.md](./party.md) | 2026-06-18 | active |
| party_email.address unique — login safety | [party.md](./party.md) | 2026-06-18 | superseded |
| party identity — `party_user` + `user_class` | [party.md](./party.md) | 2026-06-15 | superseded |
| billing — earned staging, progress, SOV, retainage | [billing.md](./billing.md) | 2026-06-17 | active |
| SOV UI — nested on `job_detail` Billing tab | [billing.md](./billing.md) | 2026-06-17 | active |
| labor phases — catalog only in v1 | [catalog.md](./catalog.md) | 2026-06-17 | active |
| job wave 5 — implementation order (catalog-first) | [job.md](./job.md) | 2026-06-23 | active |
| estimate wave 4 — implementation order | [estimate.md](./estimate.md) | 2026-06-23 | active (amended 2026-06-23) |
| estimate line editor — expand on add and grouped Table UI | [estimate.md](./estimate.md) | 2026-06-23 | active |
| estimate / job line grouping — site geography | [estimate.md](./estimate.md) | 2026-06-17 | active |
| Surface catalog before migrations | [general.md](./general.md) | 2026-06-17 | active |
| field status — `job_work_item` | [job.md](./job.md) | 2026-06-17 | superseded |
| change orders — unified `job_line` ledger | [job.md](./job.md) | 2026-06-17 | active |
| engagements — `job_kind` | [job.md](./job.md) | 2026-06-17 | active |
| `job_detail` layout — tabbed | [job.md](./job.md) | 2026-06-17 | active |
| party profile Fields on type lenses | [party.md](./party.md) | 2026-06-17 | active |
| `employee_detail` scope — marker now, HR later | [party.md](./party.md) | 2026-06-17 | active |
| procurement — requisition layer and job-site inventory | [procurement.md](./procurement.md) | 2026-06-17 | active |
| site geography UI — systems & areas tree table | [site.md](./site.md) | 2026-06-30 | active |
| address vs site geography — rename and split | [site.md](./site.md) | 2026-06-17 | active |
| site-owned sections and locations — lifecycle and history | [site.md](./site.md) | 2026-06-17 | active |
| site geography — slim rows and `latch_audit` | [site.md](./site.md) | 2026-06-17 | active |
| site geography on `site_detail` — timing | [site.md](./site.md) | 2026-06-17 | active |
| party list/detail Surface shape | [party.md](./party.md) | 2026-06-16, **locked 2026-06-17** | active |
| org subsidiaries — Model A | [party.md](./party.md) | 2026-06-18 | active (DDL deferred) |
| org contacts — `party_contact` | [party.md](./party.md) | 2026-06-18 | active (DDL deferred) |
| customer hub — portal tree | [party.md](./party.md) | 2026-06-18 | active |
| vendor hub — subsidiaries, POs, no sites | [party.md](./party.md) | 2026-06-18 | active |
| manufacturer hub — base lens only | [party.md](./party.md) | 2026-06-18 | active |
| property owner hub — subsidiaries, contacts, sites | [party.md](./party.md) | 2026-06-18 | active (DDL deferred) |
| parent org Field — `parent_customer` / `parent_vendor` / `parent_property_owner` | [party.md](./party.md) | 2026-06-18 | active |
| `site.customer_party_id` — portfolio link | [site.md](./site.md) | 2026-06-18 | active (DDL deferred) |
| `site.property_owner_party_id` — portfolio link | [site.md](./site.md) | 2026-06-18 | active (DDL deferred) |
| portfolio FKs on `site_detail` — writable scalars | [site.md](./site.md) | 2026-06-19 | active |
| site delete — blockers and cascade | [site.md](./site.md) | 2026-06-19 | active |
| site orphans and naming | [site.md](./site.md) | 2026-06-19 | active |
| postal address — normalized spine and party vs site roles | [site.md](./site.md) | 2026-06-19 | active (physical FK DDL wave 2b) |
| shared `address` row — copy-on-write on PATCH | [site.md](./site.md) | 2026-06-19 | active |
| site nesting — when site vs location vs job | [site.md](./site.md) | 2026-06-19 | active |
| section vs location — granularity | [site.md](./site.md) | 2026-06-19 | active |
| cross-Surface related records — navigation only v1 | [general.md](./general.md) | 2026-06-18 | active |
| catalog — simplified parts, items, categories | [catalog.md](./catalog.md) | 2026-06-16 | active |
| progressive setup — master catalogs | [cross-cutting.md](./cross-cutting.md) | 2026-06-16 | active |
| schema-first — finish DBML before migrations | [general.md](./general.md) | 2026-06-16 | active |
| catalog tables — editable table page, not master-detail | [general.md](./general.md) | 2026-06-16 | active |
| in-building work scope — estimate → job lifecycle | [site.md](./site.md) | 2026-06-16 | superseded |
| Slice 2 UI scope — planning gate | [site.md](./site.md) | 2026-06-16 | active |
| business data seeding | [cross-cutting.md](./cross-cutting.md) | 2026-06-15 | active |
| job anchor and stakeholders — deferred to job slice | [job.md](./job.md) | 2026-06-15 | active |
| party_role master tags vs job-scoped relations | [party.md](./party.md) | 2026-06-15 | active |
| site vs location — separate entities | [site.md](./site.md) | 2026-06-15 | superseded |
| location attachments | [site.md](./site.md) | 2026-06-15 | superseded |
| address verification — deferred | [site.md](./site.md) | 2026-06-15 | active |
| site contacts — `site_contact_relation` catalog | [site.md](./site.md) | 2026-06-15 | active |
| installed systems — deferred to catalog slice | [site.md](./site.md) | 2026-06-15 | active |
| site contacts and systems | [site.md](./site.md) | 2026-06-15 | superseded |
| sidebar grouping — chrome flat, Surfaces in Menu groups | [general.md](./general.md) | 2026-06-13 | active |
| shell chrome layers — sidebar, app header, page toolbar | [general.md](./general.md) | 2026-06-13 | active |
| SurfaceToolbar — priority actions + overflow menu | [general.md](./general.md) | 2026-06-13 | active |
| first-run setup — no SQL user seed | [general.md](./general.md) | 2026-06-13 | active |
| Slice 0 dev seed — single master user, system roles | [general.md](./general.md) | 2026-06-13 | superseded |
| row timestamps vs audit — DDL vs Surface Fields | [general.md](./general.md) | 2026-06-13 | active |
| single `/login` page — no modal | [general.md](./general.md) | 2026-06-12 | active |
| no `proxy.ts` / `middleware.ts` for auth | [general.md](./general.md) | 2026-06-12 | active |
| per-page `requireAuth(path)` for private routes | [general.md](./general.md) | 2026-06-12 | active |
| SubHub is the primary Latch consumer app | [general.md](./general.md) | 2026-06-12 | active |
| no approval / verification workflow | [general.md](./general.md) | 2026-06-12 | active |
| explicit routes — no catch-all surface pages or APIs | [general.md](./general.md) | 2026-06-12 | active |
| master-detail via nested layout, not parallel routes | [general.md](./general.md) | 2026-06-12 | active |
| UI dependencies | [general.md](./general.md) | 2026-06-12 | active |
| child collections as logical Fields | [general.md](./general.md) | 2026-06-12 | active |
| line-item snapshots on estimate → job → invoice | [general.md](./general.md) | 2026-06-12 | active |
| desktop-only | [general.md](./general.md) | 2026-06-12 | active |
| shared root shell — nav varies by session | [general.md](./general.md) | 2026-06-12 | active |
| three nav sources — public, session, manifest | [general.md](./general.md) | 2026-06-12 | active |
| sidebar nav uses `next/link` for route prefetch | [general.md](./general.md) | 2026-06-12 | active |
| party spine for contacts | [party.md](./party.md) | 2026-06-12 | active |
