# SubHub — decisions index

> Lock choices here before implementation tasks. Add dated **Decision** blocks to the appropriate domain file — not in task files.

## Open

| Fork | Doc | Notes |
|------|-----|--------|
| Service / warranty / T&M (SW1–SW5); blank-job Add condition (SW0) | [planning/17-service-warranty-tm-open.md](../planning/17-service-warranty-tm-open.md) | **Parked** 2026-07-15 — needs decision session; JC1–JC2 stay locked |

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
| [15-job-costing-and-change-orders.md](../planning/15-job-costing-and-change-orders.md) | Job budget/committed/actual/margin layers; re-budget vs. CO; CO ↔ BOM ↔ scope phase reconciliation (2026-07-14) |
| [16-estimate-job-co-boundaries.md](../planning/16-estimate-job-co-boundaries.md) | As-sold via estimate Win; Jobs New kept; CO Surfaces separate; condition drift; mid-job progress (JC1–JC7, 2026-07-15) |
| [17-service-warranty-tm-open.md](../planning/17-service-warranty-tm-open.md) | **Open / parked** — T&M, fixed service, warranty tickets, blank-job Add condition (2026-07-15) |

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
| [costing.md](./costing.md) | Job budget/committed/actual/margin, re-budget |
| [cross-cutting.md](./cross-cutting.md) | Notes, attachments, seeding, progressive setup |

## All decisions (by date)

| Decision | File | Date | Status |
|----------|------|------|--------|
| Estimate status dropdown lifecycle (ST1–ST10) | [estimate.md](./estimate.md#decision-estimate-status-dropdown-lifecycle-st1st10-2026-07-21) | 2026-07-21 | **locked** (task [65](../tasks/65-estimate-status-dropdown.md); follow-ons [66](../tasks/66-estimate-draft-recalculate.md), [67](../tasks/67-estimate-accept-customer-po.md); supersedes W6 Win/Lose) |
| Requisitions live pool, per-line rollup, PO job-lock (RP1–RP10) | [procurement.md](./procurement.md#decision-requisitions-live-pool-per-line-rollup-and-po-job-lock-rp1rp10-2026-07-21) | 2026-07-21 | **locked** (tasks [61](../tasks/61-job-material-lock-and-phase.md)–[64](../tasks/64-general-bucket-purchase-orders.md); reverses IT4/RQ-UI3 `job × part` rollup) |
| Job material lock, phase-aware zone Order, live requisition pool (JML1–JML12) | [job.md](./job.md#decision-job-material-lock-phase-aware-zone-order-and-live-requisition-pool-jml1jml12-2026-07-21) | 2026-07-21 | **locked** (tasks [61](../tasks/61-job-material-lock-and-phase.md), [62](../tasks/62-field-zone-phase-order.md); amends FI12 Field Work list, Field zone Order derivation) |
| Material phase — item default + job line override (MP1–MP4) | [catalog.md](./catalog.md#decision-material-phase--item-default--job-line-override-mp1mp4-2026-07-21) | 2026-07-21 | **locked** · amended UI inherit (category→child + row radio; task [61](../tasks/61-job-material-lock-and-phase.md)) |
| Field Issues — signal-only + revert Field ad-hoc (FI1–FI12) | [job.md](./job.md#decision-field-issues--signal-only--revert-field-ad-hoc-fi1fi12-2026-07-20) | 2026-07-20 | **locked** + **implemented** (task [60](../tasks/60-field-issues-table-revert-adhoc.md); amends ISS3 UI; supersedes AH1–AH3) |
| Material request `item_id` + pool/PO descriptions (IT1–IT8) | [procurement.md](./procurement.md#decision-material-request-item_id--poolpo-descriptions-it1it8-2026-07-20) | 2026-07-20 | **locked** + **implemented** (task [59](../tasks/59-material-request-item-id-and-descriptions.md)) |
| Requisitions = PO pool UX (fold workbench) (RQ-UI1–RQ-UI8) | [procurement.md](./procurement.md#decision-requisitions--po-pool-ux-fold-workbench-rq-ui1rq-ui8-2026-07-20) | 2026-07-20 | **locked** + **implemented** (task [58](../tasks/58-requisitions-po-pool-ux.md); RQ-UI2 = job-required, no All jobs) |
| Field — progress reports + zone Order compose (L0–L31) | [job.md](./job.md#decision-field--progress-reports--zone-order-compose-2026-07-17) · [procurement.md](./procurement.md#decision-field-zone-order--requisition-snapshots-2026-07-17) | 2026-07-17 | **locked** ([planning/20](../planning/20-field-labor-materials-open.md); task [55](../tasks/55-field-progress-reports-zone-order.md)) |
| Requisition Surfaces UX (R1–R8) | [procurement.md](./procurement.md#decision-requisition-surfaces-ux-r1r8-2026-07-16) | 2026-07-16 | **locked** ([planning/19](../planning/19-requisition-surfaces-open.md); compose amended by Field zone Order 2026-07-17; R5 chrome amended by RQ-UI 2026-07-20) |
| CCTV accessories — mounts, recorders, licenses (A1–A8) | [catalog.md](./catalog.md#decision-cctv-accessories--mounts-recorders-licenses-2026-07-16) | 2026-07-16 | **locked** (seed `082`) |
| CCTV starter spec namespace — Platform / Form Factor / Resolution / Housing | [catalog.md](./catalog.md#decision-cctv-starter-spec-namespace-2026-07-16) | 2026-07-16 | **locked** (seed `081`; amended by accessories) |
| Job Field progress — boolean zone snapshot (5c) (F1–F9) | [job.md](./job.md#decision-job-field-progress--boolean-zone-snapshot-5c-2026-07-16) | 2026-07-16 | **locked** ([51](../tasks/51-job-field-progress.md) ready; [planning/18](../planning/18-job-field-progress.md)) |
| Estimate / job / CO commercial boundaries (JC1–JC7) | [job.md](./job.md#decision-estimate--job--co-commercial-boundaries-2026-07-15) | 2026-07-15 | **locked** ([48](../tasks/48-job-create-front-doors-condition-drift.md), [49](../tasks/49-change-order-surfaces.md); companion [estimate.md](./estimate.md#decision-estimate--job--co-commercial-boundaries-2026-07-15)) |
| Estimate win → job handoff (W0–W7 + Scope-U1/E1/F1/S1 thick 5b) | [estimate.md](./estimate.md#decision-estimate-win--job-handoff-2026-07-14) | 2026-07-15 | **locked** (5b); **W6 UI superseded** by [ST1–ST10](./estimate.md#decision-estimate-status-dropdown-lifecycle-st1st10-2026-07-21) |
| Job LI parity — dual qty + Item/Part + zone danger (JLI-1…7; amends Scope-F1) | [estimate.md](./estimate.md#w3--conditions--costing-on-the-job-locked--amends-prior-estimate-only) | 2026-07-15 | **locked** ([47](../tasks/47-job-line-items-parity.md)) |
| Job costing — budget/committed/actual/margin layers | [costing.md](./costing.md#decision-job-costing--budget--committed--actual--margin-layers-2026-07-14) | 2026-07-14 | **locked** ([45](../tasks/45-job-costing-and-change-order-reconciliation.md); planning only, no schema yet) |
| `material_receipt_line.unit_cost` — material actual cost | [costing.md](./costing.md#decision-material_receipt_lineunit_cost--material-actual-cost-2026-07-14) | 2026-07-14 | **locked** ([45](../tasks/45-job-costing-and-change-order-reconciliation.md)) |
| Re-budget — `job_line_cost_revision`, distinct from change order | [costing.md](./costing.md#decision-re-budget--job_line_cost_revision-distinct-from-change-order-2026-07-14) | 2026-07-14 | **locked** ([45](../tasks/45-job-costing-and-change-order-reconciliation.md)) |
| Change order — BOM and scope phase reconciliation | [job.md](./job.md#decision-change-order--bom-and-scope-phase-reconciliation-2026-07-14) | 2026-07-14 | **locked** ([45](../tasks/45-job-costing-and-change-order-reconciliation.md); amends [2026-06-17](./job.md#decision-change-orders--unified-job_line-ledger-2026-06-17)) |
| Condition labor only + Y4 discontinued inherit (L1–L12) | [estimate.md](./estimate.md#decision-condition-labor-only--y4-discontinued-2026-07-14) | 2026-07-14 | **locked** ([43](../tasks/43-estimate-labor-only.md); amends W2b) |
| Line Items zone tree popover — checkable tree + exclusive qty (Z1–Z8) | [estimate.md](./estimate.md#decision-line-items-zone-tree-popover--exclusive-qty-2026-07-14) | 2026-07-14 | **locked** ([42c](../tasks/42c-estimate-line-zone-tree-popover.md); amends G3/X3) |
| Detail tab persistence — URL `?tab=` + availability fallback | [general.md](./general.md#decision-detail-tab-persistence--url-tab--availability-fallback-2026-07-13) | 2026-07-13 | **locked** ([40](../tasks/40-detail-tab-persistence.md)) |
| Spec participation removed — namespace narrowing + part-row presence (V1–V8) | [catalog.md](./catalog.md) | 2026-07-12 | **locked** ([37ai](../tasks/37ai-spec-participation-removal.md)) |
| Spec threshold presets + numeric bucket ranges (A1–T10) | [catalog.md](./catalog.md) | 2026-07-12 | **superseded** by [41ao](../tasks/41ao-drop-threshold-presets.md) (numeric ranges retained) |
| Labor phase per-row override — merge across full ancestry | [catalog.md](./catalog.md) | 2026-07-12 | **locked** ([37ad](../tasks/37ad-labor-phase-per-row-override.md)) |
| Deferred — cross-spec dependency and derived specs | [catalog.md](./catalog.md) | 2026-07-11 | **deferred** |
| `slc_protocol` naming — rename + explicit `none`/`conventional` option | [catalog.md](./catalog.md) | 2026-07-11 | planning (no task) |
| Enum / numeric threshold presets (2026-07-11 proposals) | [catalog.md](./catalog.md) | 2026-07-11 | **superseded** by 2026-07-12 locked decision |
| Item placement + mount axis override — reverted, leaf duplication instead (R1–R6) | [catalog.md](./catalog.md) | 2026-07-11 | **locked** ([37ac](../tasks/37ac-item-placement-mount-axis-revert.md)) |
| Item placement — multi-location browse tree, decoupled from cost resolution (L1–L6) | [catalog.md](./catalog.md) | 2026-07-11 | **superseded** ([37ac](../tasks/37ac-item-placement-mount-axis-revert.md)) |
| Item labor axis override — single-spec axis, no compound (M1–M7, M7 = margin FK extension) | [catalog.md](./catalog.md) | 2026-07-11 | **superseded** ([37ac](../tasks/37ac-item-placement-mount-axis-revert.md)) |
| Line item pick + costing walkthrough (W1+) | [estimate.md](./estimate.md#decision-line-item-pick--costing-walkthrough-2026-07-13) | 2026-07-13 | **in progress** (W1, W2a locked; [37aj](../tasks/37aj-estimate-part-select-and-seed.md) ✅; next W2b or 37h) |
| Dual line locks + live preview (P1–P7) | [estimate.md](./estimate.md#decision-estimate-dual-line-locks-and-live-preview-2026-07-11) | 2026-07-11 | **locked** ([37aa](../tasks/37aa-estimate-line-live-preview.md)) |
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
| Estimate site anchor — gate lines, immutable after create | [estimate.md](./estimate.md) | 2026-06-30 | **superseded** 2026-07-14 ([warn-and-clear](./estimate.md#decision-estimate--job-site-anchor--warn-and-clear-not-immutable-2026-07-14)) |
| Estimate + job site anchor — warn-and-clear, not immutable | [estimate.md](./estimate.md), [job.md](./job.md) | 2026-07-14 | **locked** |
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
