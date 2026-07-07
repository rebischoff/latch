# 01 — Task index

> Read once. **Do not implement in this file.**

## Goal

Orient the SubHub delivery slices and task chain. Global status: [`../../STATUS.md`](../../STATUS.md).

## Prerequisites

- [00-decisions.md](./00-decisions.md) complete.
- Platform scaffold applied (`migrations/001`–`012`, `.env.local`, auth smoke test).
- Skim [`../architecture.md`](../architecture.md) and [`../decisions/README.md`](../decisions/README.md).

## Execution order (Slice 0 → 1 → …)

```
00-decisions
  → 02-ui-deps → 03-shell-layout → 04-auth-entry → 05-nav-manifest
  → 06-iam-surfaces → 07-iam-dal-api → 08-iam-ui → 09-dev-roles-seed
  → 10-party-migration → 11-contact-surfaces → 12-contact-dal-api
  → 13-contact-ui → 14-contact-child-collections
  → 15-entity-flow → 16-slice2-planning-gate → 17-schema-design-pass
  → 18-surface-catalog → 19-surface-implement-specs (checkpoint)
  → 20-ui-discovery → resume 19 → 22-estimate-wave-4a → 23-job-wave-5a → 24-part-wave-3a → 25-manufacturer-detail → implementation waves
  → **29-backbone-dbml-pass** → **30-backbone-surfaces-review** → **31-estimate-backbone-migrations** → **32-estimate-wave-4e** (estimate finish on backbone)
  → 21-bundler-import-convention (parallel — Turbopack / import paths)
```

## Dependency diagram (Slice 0–1)

```mermaid
flowchart TD
  d00[00 decisions] --> d02[02 UI deps]
  d02 --> d03[03 shell layout]
  d03 --> d04[04 auth entry]
  d04 --> d05[05 nav manifest]
  d05 --> d06[06 IAM surfaces]
  d06 --> d07[07 IAM DAL API]
  d07 --> d08[08 IAM UI]
  d08 --> d09[09 first-run setup]
  d09 --> d10[10 party migration]
  d10 --> d11[11 contact surfaces]
  d11 --> d12[12 contact DAL API]
  d12 --> d13[13 contact UI]
  d13 --> d14[14 child collections]
```

---

## Slice 00 — App shell

**Exit criteria:** Complete `/setup`; log in with `login_name`; nav shows permitted Surfaces; IAM users/roles CRUD for master (`system_iam`).

| # | Task | Delivers |
|---|------|----------|
| 02 | [02-ui-dependencies.md](./02-ui-dependencies.md) | antd, RHF, React Query, registry |
| 03 | [03-app-shell-layout.md](./03-app-shell-layout.md) | `(public)` / `(app)` groups, sidebar shell |
| 04 | [04-auth-entry.md](./04-auth-entry.md) | `/login` (public); `requireAuth(path)` gate; `callbackUrl`; no proxy |
| 05 | [05-nav-manifest.md](./05-nav-manifest.md) | Sidebar: chrome flat + Surface groups; `next/link`; app header / page toolbar documented |
| 06 | [06-iam-surfaces.md](./06-iam-surfaces.md) | IAM `*.surface.yaml` |
| 07 | [07-iam-dal-api.md](./07-iam-dal-api.md) | IAM DAL + explicit API routes |
| 08 | [08-iam-ui.md](./08-iam-ui.md) | Users + roles master-detail; `SurfaceToolbar` (priority + overflow) |
| 09 | [09-dev-roles-seed.md](./09-dev-roles-seed.md) | `/setup` wizard — `login_name` + token; platform `013` identity guards |

---

## Slice 01 — Party / contacts

**Exit criteria:** CRUD contacts with phones/emails; filtered customer/vendor/manufacturer lists.

| # | Task | Delivers |
|---|------|----------|
| 10 | [10-party-migration.md](./10-party-migration.md) | `party`, `party_phone`, `party_email`, `party_role`, `employee` |
| 11 | [11-contact-surfaces.md](./11-contact-surfaces.md) | Surface YAML + codegen + registry |
| 12 | [12-contact-dal-api.md](./12-contact-dal-api.md) | Repository, DAL, `/api/contacts` routes |
| 13 | [13-contact-ui.md](./13-contact-ui.md) | `/contacts` master-detail + forms |
| 14 | [14-contact-child-collections.md](./14-contact-child-collections.md) | Phones/emails field arrays |

---

## Schema design (pre-migration)

**Exit criteria:** [`current.dbml`](../schema/current.dbml) covers Slices 2–6 at column level; decisions locked.

| # | Task | Delivers |
|---|------|----------|
| 17 | [17-schema-design-pass.md](./17-schema-design-pass.md) | DBML through catalog, estimates, jobs, financial; schema-first decision |

---

## Surface & Field catalog (pre-implementation)

**Exit criteria:** [`surfaces.md`](../surfaces.md) design-complete at Field level; open decisions O1–O7 resolved; implementation waves re-cut. **Complete 2026-06-17.**

| # | Task | Delivers |
|---|------|----------|
| 18 | [18-surface-catalog.md](./18-surface-catalog.md) | Canonical Surface/Field catalog; resolve open UI decisions — **complete** |

**Migration spec:** [deferred/site-migration.md](./deferred/site-migration.md) — **complete** (task 20 step 1, 2026-06-20).

---

## Surface implement specs

| **Checkpoint (2026-06-29):** Backbone DDL shipped — tasks **29**–**31** complete (`current.dbml` amend, surfaces review, `028`–`031` migrations applied to dev). **Next:** task **32** estimate 4e (finish estimates on backbone). Manufacturer task **25** paused — not blocking estimate track.

| # | Task | Delivers |
|---|------|----------|
| 19 | [19-surface-implement-specs.md](./19-surface-implement-specs.md) | Implement specs — **`part.md`** ✅ (row #14); rows **#15–18** before 3b/3c |
| 20 | [20-ui-discovery.md](./20-ui-discovery.md) | Migration + sites UI + estimate spike + planning — **complete** (2026-06-23) |
| 21 | [21-bundler-import-convention.md](./21-bundler-import-convention.md) | Extensionless imports; Turbopack-first dev — **complete** (2026-06-20) |
| 22 | [22-estimate-wave-4a.md](./22-estimate-wave-4a.md) | Wave 4a — estimate migration, DAL, flat production UI — **complete** (legacy schema) |
| 23 | [23-job-wave-5a.md](./23-job-wave-5a.md) | Wave 5a — job shell, Overview + stub tabs — **complete** |
| 24 | [24-part-wave-3a.md](./24-part-wave-3a.md) | Wave 3a — part MPN catalog + vendor pricing — **complete** |
| **29** | [29-backbone-dbml-pass.md](./29-backbone-dbml-pass.md) | Planning → amended `current.dbml` — **complete** (2026-06-29) |
| **30** | [30-backbone-surfaces-review.md](./30-backbone-surfaces-review.md) | `codegen:check` + impact matrix + schema README — **complete** (2026-06-29) |
| **31** | [31-estimate-backbone-migrations.md](./31-estimate-backbone-migrations.md) | Estimate-minimal DDL + discussed dev seeds (`028`–`031`) — **complete** (2026-06-29) |
| **32** | [32-estimate-wave-4e.md](./32-estimate-wave-4e.md) | Estimate `estimate_system` tabs + backbone DAL/UI — **complete** |
| **33** | [33-estimate-site-anchor.md](./33-estimate-site-anchor.md) | Site anchor — gate lines, immutable site, Add site picker return — **complete** |

---

## Task 21 — Bundler import convention

**Exit criteria:** Turbopack dev works without webpack `extensionAlias`; codegen + packages + SubHub use extensionless relative imports; CI guardrail; decision documented.

| Step | Delivers |
|------|----------|
| 1 | Platform decision — bundler monorepo import convention ✅ |
| 2 | Codegen + scaffold template emit extensionless paths |
| 3 | `packages/*/src` codemod |
| 4 | `apps/subhub` codemod + `next.config` Turbopack default |
| 5 | CI lint + remove transitional webpack/debug cruft ✅ |

**Parallel with task 20** — no domain dependency. Prefer early if dev compile speed blocks discovery.

---

## Task 20 — UI discovery

**Exit criteria:** Wave 1 migration applied; `site_list` / `site_detail` shipped; estimate line-editor spike reviewed; planning session captured in decisions + `estimate.md`; STATUS names next wave.

| Step | Delivers | Spec / doc |
|------|----------|------------|
| **1** ✅ | `018`–`020` SQL | [deferred/site-migration.md](./deferred/site-migration.md) |
| **2** ✅ | Sites YAML, DAL, UI | [site.md](../surface-specs/site.md), [site-contact-relation.md](../surface-specs/site-contact-relation.md) |
| **3** ✅ | Estimate line-editor spike | [spikes/estimate-line-editor.md](../spikes/estimate-line-editor.md) |
| **4** ✅ | Planning session | [estimate.md](../surface-specs/estimate.md); wave **4a** named in STATUS |

```mermaid
flowchart LR
  mig[step 1 migration]
  sites[step 2 sites UI]
  spike[step 3 estimate spike]
  plan[step 4 planning session]
  t19[resume task 19]
  mig --> sites
  sites --> spike
  spike --> plan
  plan --> t19
```

**Parallel:** Step 3 may use fixture routes before step 2 completes; wire live `site_id` after sites ship.

---

## Implementation waves

Delivery order **after task 20 step 4** (planning session names exact next wave). Task 19 final exit may overlap with waves 2+.

### Wave 1 — Sites (+ party refactor migration) — **task 20 steps 1–2** ✅

**Exit criteria:** CRUD flat sites; standing contacts; relation catalog table. DDL per [`deferred/site-migration.md`](./deferred/site-migration.md). **Complete 2026-06-22** (step 2.10 stop gate).

| # | Task | Delivers |
|---|------|----------|
| 20.1 | `deferred/site-migration.md` | `018`–`020` SQL — party refactor + sites ✅ |
| 20.2 | site surfaces + DAL/UI | `site_list`, `site_detail`, `site_contact_relation_table` ✅ |

**Deferred within wave 1 UI:** `parent_site_id` picker; `site_section` / `site_location` on `site_detail` (wave 2b — promote if estimate spike selects grouped mode).

```mermaid
flowchart LR
  t20[20 UI discovery]
  w1m[step 1 migration]
  w1u[step 2 sites UI]
  t20 --> w1m --> w1u
```

### Wave 2 — Party addresses + site geography

| # | Task | Delivers |
|---|------|----------|
| **34** | [34-site-geography-ui.md](./34-site-geography-ui.md) | `systems` + `default_areas` DAL + Geography tab (**table** interim UI) ✅ |
| **35** | [35-site-geography-drop-area-metadata.md](./35-site-geography-drop-area-metadata.md) | Drop `site_area.area_type` / `code`; name-only PATCH ✅ |
| **36** | [36-site-geography-tree-ui.md](./36-site-geography-tree-ui.md) | **antd `Tree`** editor; deleted `SiteGeographyTreeTable` — **complete** |
| *TBD* | | `addresses` on `{role}_detail` lenses |
| *TBD* | | `parent_site`, `physical_address` on `site_detail` — remainder of legacy [`site-geography.md`](../surface-specs/site-geography.md) |

### Wave 4 — Estimates (flat) — **task 22** — **complete**

**Exit criteria:** CRUD draft estimates with flat `line_items` + stakeholders; job party relation catalog. Spec: [`estimate.md`](../surface-specs/estimate.md). **Deferred in 4a:** grouped editor, `quote_sections`, `win`/`lose`.

| # | Task | Delivers |
|---|------|----------|
| 22.1 | [22-estimate-wave-4a.md](./22-estimate-wave-4a.md) step 1 | `021` estimate DDL migration |
| 22.2 | step 2 | `estimate_*` + `job_party_relation_table` YAML + codegen |
| 22.3 | step 3 | Job party relation catalog DAL + API |
| 22.4–22.6 | steps 4–6 | Estimate DAL + API |
| 22.7–22.9 | steps 7–9 | Nav + list/detail UI + flat line editor |
| 22.10 | step 10 | Stop gate |

```mermaid
flowchart LR
  t22[22 estimate wave 4a]
  mig[step 1 migration]
  yaml[step 2 YAML]
  dal[steps 3-6 DAL/API]
  ui[steps 7-9 UI]
  gate[step 10]
  t22 --> mig --> yaml --> dal --> ui --> gate
```

**Follow-on (not 4a):** wave **4e** backbone alignment ([task 32](./32-estimate-wave-4e.md)) — **complete**; **category scope** ([37a](./37a-category-scope-decision-dbml-migration.md) ✅ → [37b](./37b-category-scope-migration-apply.md) ✅ → **37c** site → 37d–37h); wave **4b** `win`/`lose`; wave **4c** grouped editor polish; wave **4d′** shared line editor retrofit — [job wave 5 decision](../decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23).

### Category scope — tasks 37a–37h

| # | Task | Delivers |
|---|------|----------|
| **37a** | [37a-category-scope-decision-dbml-migration.md](./37a-category-scope-decision-dbml-migration.md) | Decision + DBML + `033` migration plan — **complete** |
| **37b** | [37b-category-scope-migration-apply.md](./37b-category-scope-migration-apply.md) | Apply `033` on dev; FK smoke — **complete** |
| **37c** | [37c-site-scopes-zones.md](./37c-site-scopes-zones.md) | Site `site_scope` / `site_zone` DAL + Scopes & zones UI — **complete** |
| **37d** | [37d-category-catalog-dal-surfaces.md](./37d-category-catalog-dal-surfaces.md) | `category_list` / `category_detail` — tree list pane, spec DAL — **complete** |
| **37d2** | [37d2-category-spec-inheritance.md](./37d2-category-spec-inheritance.md) | Spec participation tables + scope panel union — **complete** (superseded by 37d3) |
| **37d3** | [37d3-category-spec-participation-simplify.md](./37d3-category-spec-participation-simplify.md) | Assign-once participation + UI; migration `037` — **complete** (visibility superseded by 37d4) |
| **37d4** | [37d4-category-spec-visibility.md](./37d4-category-spec-visibility.md) | Owner-branch spec visibility + category UI — **complete** (storage superseded by 37d5) |
| **37d5** | [37d5-category-spec-owner-column.md](./37d5-category-spec-owner-column.md) | `spec_def.category_id` owner column; drop `category_spec_def`; migration `038` — **complete** |
| **37e** | [37e-estimate-scope-tab.md](./37e-estimate-scope-tab.md) | Estimate Scope tab DAL/UI + migration 035 + minimal line retarget — **complete** |
| **37f** | [37f-estimate-line-costing.md](./37f-estimate-line-costing.md) | Scope required; zone parents; TreeSelect; part filter; material snapshot — **complete** |
| **37i** | [37i-unified-item-tree-apply.md](./37i-unified-item-tree-apply.md) | Migration **040a**; unified `item` tree; catalog rename; branch picker — **complete** |
| **37g** | [37g-commercial-costing.md](./37g-commercial-costing.md) | Org rate tables; commercial engine; migration **040b** (after **37i**) — **complete** |
| **37j** | [37j-catalog-part-authoring.md](./37j-catalog-part-authoring.md) | `item_links` + `part_specs` on `part_detail` — **complete** (2026-07-06) |
| **37k** | [37k-part-spec-lifecycle.md](./37k-part-spec-lifecycle.md) | Prune `manufacturer_part_spec` on link shrink; diff `spec_option` writes; part/item warnings — **complete** (2026-07-06) |
| **37l** | [37l-leaf-quotable-item-model.md](./37l-leaf-quotable-item-model.md) | `item.node_type` (scope/category/item); leaf-only estimate selection; drop `descendantMax`; migration `044` — **complete** (2026-07-06) |
| **37h** | *(see 37a chain)* | Job `site_zone_id` FK renames |

### Backbone pass (estimate finish) — tasks 29–32

**Exit criteria:** Estimates CRUD on `estimate_system` + backbone line FKs; legacy `estimate_section` / `site_location_id` retired in app code.

| # | Task | Delivers |
|---|------|----------|
| 29 | [29-backbone-dbml-pass.md](./29-backbone-dbml-pass.md) | Amended `current.dbml` per [planning/09-migration-notes.md](../planning/09-migration-notes.md) — **complete** |
| 30 | [30-backbone-surfaces-review.md](./30-backbone-surfaces-review.md) | Pre-migration gate — impact matrix, `codegen:check`, schema README — **complete** |
| 31 | [31-estimate-backbone-migrations.md](./31-estimate-backbone-migrations.md) | DDL + discussed dev seeds (site rename, `system`, `estimate_system`, …) — **complete** (`028`–`031`) |
| 32 | [32-estimate-wave-4e.md](./32-estimate-wave-4e.md) | DAL + UI — system tabs, specs, backbone line columns — **complete** |

```mermaid
flowchart LR
  t29[29 DBML pass]
  t30[30 surfaces review]
  t31[31 migrations]
  t32[32 estimate 4e]
  t29 --> t30 --> t31 --> t32
```

### Wave 5a — Jobs shell — **task 23** — **complete**

**Exit criteria:** CRUD jobs with profile + stakeholders; tabbed `/jobs` shell; DAL `line_items` for win-copy; **no Scope line grid**. Spec: [`job.md`](../surface-specs/job.md). **Decision:** [job wave 5](../decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23).

| # | Task | Delivers |
|---|------|----------|
| 23.1 | [23-job-wave-5a.md](./23-job-wave-5a.md) step 1 | `023` job DDL migration |
| 23.2 | step 2 | `job_*` YAML + codegen |
| 23.3 | step 3 | `job_party` InUseError on relation catalog |
| 23.4–23.6 | steps 4–6 | Job DAL + API |
| 23.7–23.9 | steps 7–9 | Nav + list/detail UI + stakeholders + tabs |
| 23.10 | step 10 | Stop gate |

**Follow-on:** wave **3** catalog → **3e** line editor → **4d′** Scope UI → **5b** win/lose → **5c** field + complete → **5d** COs.

### Wave 3a — Parts catalog — **task 24** — **complete**

**Exit criteria:** CRUD parts with MPN profile + vendor pricing replace-array; manufacturer delete blocker. Spec: [`part.md`](../surface-specs/part.md). **Decision:** [catalog-first line UI](../decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23).

| # | Task | Delivers |
|---|------|----------|
| 24.1 | [24-part-wave-3a.md](./24-part-wave-3a.md) step 1 | `024` part DDL migration |
| 24.2 | step 2 | `part_*` YAML + codegen |
| 24.3 | step 3 | `manufacturer_part` InUseError on manufacturer delete |
| 24.4–24.6 | steps 4–6 | Part DAL + API |
| 24.7–24.9 | steps 7–9 | Nav + list/detail UI + vendor pricing grid |
| 24.10 | step 10 | Stop gate |

**Follow-on:** task **25** manufacturer detail → wave **3b** `item_*` → **3c** catalog tables → **3e** line editor → **4d′** Scope UI.

### Task 25 — Manufacturer detail — **paused** (not blocking estimate track)

**Exit criteria:** CRUD `manufacturer_detail` (kind-specific profile, phones/emails); `add_role` / `remove_role`; picker return-context from `part_detail`; `/manufacturers` master-detail; `LinkedSelectInput` on part manufacturer picker. Spec: [`manufacturer.md`](../surface-specs/manufacturer.md). **Resume after task 32 or in parallel.**

| # | Task | Delivers |
|---|------|----------|
| 25.1 | [25-manufacturer-detail.md](./25-manufacturer-detail.md) step 1 | `manufacturer_detail` YAML + codegen |
| 25.2 | step 2 | Picker return-context helper |
| 25.3–25.4 | steps 3–4 | Manufacturer DAL read/write + role actions |
| 25.5–25.6 | steps 5–6 | API + surface plumbing |
| 25.7–25.8 | steps 7–8 | Nav + `PartyDetailForm` + list UI |
| 25.9 | step 9 | Part form picker integration (return context; interim link UI) |
| 25.10 | step 10 | Stop gate |
| 25.11 | step 11 | `LinkedSelectInput` + dirty navigate confirm — [spec](./25-manufacturer-detail.md#step-11--linked-picker-control-linkedselectinput) |

### Waves 3b–7 (remaining)

| Wave | Exit criteria | Surfaces (headline) |
|------|---------------|---------------------|
| 3a Parts | MPN + vendor pricing | `part_*` — **task 24 complete** |
| — Manufacturer detail | Party lens + picker return | `manufacturer_detail` — **task 25 active** |
| — IAM role CRUD | Create/save/delete app roles | `role_list` / `role_detail` — **task 26 complete** |
| — Employee detail | Staff lens + identity provision | `employee_*` — **task 28 complete** |
| 3b Items | Items composed of parts | `item_*` — **after task 25** |
| 3c Catalog tables | Progressive setup | `category_list` / `category_detail`, `labor_class_table`, `phase_table` |
| 3e Line editor | Shared line-item component spike | estimate + job Scope; later PO/invoice |
| 5 Jobs | Shell → Scope → field → COs | `job_*` wave **5a**–**5d** ([decision](../decisions/job.md#decision-job-wave-5--implementation-order-2026-06-23)) |
| 6a Procurement | Requisition → PO → receipts | `requested_order_*`, `purchase_order_*`, `material_receipt_*` |
| 6b Billing | Billable staging → invoice | `invoice_*`, `billable_items` + `sov_milestones` on `job_detail` |
| 7 Reports | Job progress aggregates | Custom SQL pages |

Field detail: [`surfaces.md`](../surfaces.md). DBML: [`current.dbml`](../schema/current.dbml).

---

## Slice 02 — Sites *(legacy label → wave 1)*

> **Superseded by [Implementation waves](#implementation-waves)** (2026-06-17). Kept for decision traceability.

**Exit criteria:** CRUD flat sites (`name`); standing contacts on `site_detail`; editable `site_contact_relation` catalog table page. DDL includes `address` + `party_address` junction + `site_section` / `site_location` (no UI for geography in wave 1); **no** party-address UI or site hierarchy UI in wave 1 ([decision](../decisions/site.md#decision-slice-2-ui-scope--planning-gate-2026-06-16).

| # | Task | Delivers |
|---|------|----------|
| 15 | [15-entity-flow.md](./15-entity-flow.md) | Cross-slice entity flow in `architecture.md` (docs only) |
| 16 | [16-slice2-planning-gate.md](./16-slice2-planning-gate.md) | Lock Slice 2 open choices; align migration before DDL |
| — | [deferred/site-migration.md](./deferred/site-migration.md) | Migration spec (was task 18) |

---

## Slice 03 — Catalog

**Exit criteria:** Parts with vendor pricing (3a); items composed of parts (3b).

| # | Task | Delivers |
|---|------|----------|
| 24 | [24-part-wave-3a.md](./24-part-wave-3a.md) | Wave **3a** — `manufacturer_part`, `vendor_part`, `part_*` surfaces — **complete** |
| 25 | [25-manufacturer-detail.md](./25-manufacturer-detail.md) | `manufacturer_detail` + picker return — **active** |
| 26 | [26-iam-role-crud.md](./26-iam-role-crud.md) | IAM `app` role create/save/delete — **complete** (2026-06-25) |
| 27 | [27-create-route-retrofit.md](./27-create-route-retrofit.md) | `/new` + DB-assigned id retrofit — **complete** (2026-06-25) |
| 28 | [28-employee-detail.md](./28-employee-detail.md) | Staff lens CRUD + provision retrofit (`/users/new`) — **complete** (2026-06-25) |
| 29 | [29-backbone-dbml-pass.md](./29-backbone-dbml-pass.md) | Backbone DBML amend — **complete** (2026-06-29) |
| 30–32 | [30](./30-backbone-surfaces-review.md) · [31](./31-estimate-backbone-migrations.md) · [32](./32-estimate-wave-4e.md) | **Estimate finish** on backbone — **active** |
| 33+ | *TBD* | 3b `item_*`, 3c catalog tables; resume task **25** manufacturer stop gate |

---

## Slice 04 — Estimates

**Exit criteria:** Estimate with snapshot line items — **wave 4a** via task 22.

| # | Task | Delivers |
|---|------|----------|
| 22 | [22-estimate-wave-4a.md](./22-estimate-wave-4a.md) | Migration, YAML, DAL, API, flat `/estimates` UI — **complete** |

---

## Slice 05 — Jobs & change orders

**Exit criteria:** Job shell (5a) → win copy (5b) → field status (5c) → change orders (5d). **Planning locked** 2026-06-23.

| # | Task | Delivers |
|---|------|----------|
| 23 | [23-job-wave-5a.md](./23-job-wave-5a.md) | Job wave **5a** shell — migration, YAML, DAL, API, Overview UI — **complete** |
| 24+ | *TBD* | 5b win/lose, 5c field, 5d change orders |

---

## Slice 06 — Financial

**Exit criteria:** Billable staging → invoice from job; PO from job parts; SOV milestones for progress jobs.

| # | Task | Delivers |
|---|------|----------|
| 31–33 | *TBD* | `billable_line`, `invoice`, `purchase_order`, SOV + `sov_allocation` — **DBML drafted** |

---

## Slice 07 — Reports

**Exit criteria:** Job progress view (PO + line tracking).

| # | Task | Delivers |
|---|------|----------|
| 34 | *TBD* | Read-only report pages (custom SQL) |

---

## STATUS discipline

When a task completes:

1. Add **Status** line under the task title with date and next link.
2. Check every item in **Verify (stop gate)**.
3. Update [`../../STATUS.md`](../../STATUS.md): **Right now**, **Recently completed**, **Updated** line.

## Reuse from platform

| Artifact | Location |
|----------|----------|
| `createResolveContext`, route factories | `@latch/app-kit` |
| `<Can>`, `<FieldControl>` | `@latch/react` |
| IAM sketch | [`user_roles_detail`](../../../../packages/_docs/phases/03-identity-iam/decisions.md) |
| CRM master-detail precedent | Phase 02 task 16 (patterns only — SubHub uses `/[id]` paths) |
| Scaffold runbook | [`scaffold-runbook.md`](../../../../packages/codegen/docs/scaffold-runbook.md) |

## Cross-cutting — UI chrome

| # | Task | Delivers |
|---|------|----------|
| 38 | [38-master-detail-chrome.md](./38-master-detail-chrome.md) | Shared toolbar + `returnTo` create navigation — **complete** |
| 39 | [39-toolbar-chrome-slots.md](./39-toolbar-chrome-slots.md) | Slot-based list/form → toolbar; category **New child** parent fix |

**Planning:** [12-master-detail-chrome.md](../planning/12-master-detail-chrome.md) · [13-toolbar-chrome.md](../planning/13-toolbar-chrome.md).

---

## Out of scope (all slices)

- Approval / verification workflow
- Optimistic React Query updates
- Mobile layout
- Catch-all `[surface]` routes
