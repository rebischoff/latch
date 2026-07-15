# SubHub decisions — job

> Jobs, field status, change orders, engagements, and `job_detail` layout.

[Index](./README.md) · [All decisions](../decisions/README.md)

---

### Decision: estimate win → job handoff (2026-07-14)

**Status:** **Locked** (W0–W7, 2026-07-15) — wave **5b** thick. Canonical detail in [`estimate.md`](./estimate.md#decision-estimate-win--job-handoff-2026-07-14).

---

### Decision: change order — BOM and scope phase reconciliation (2026-07-14)

**Status:** **Locked** (task [45](../tasks/45-job-costing-and-change-order-reconciliation.md)). **Amends:** [change orders — unified `job_line` ledger (2026-06-17)](#decision-change-orders--unified-job_line-ledger-2026-06-17) — that decision covered `job_line` only; this locks what happens to `job_line_part` (engineered BOM) and `scope_phase` (field progress) on approve. **Companion:** [`costing.md`](./costing.md) (re-budget, cost layers). **Planning:** [`planning/15-job-costing-and-change-orders.md`](../planning/15-job-costing-and-change-orders.md).

**Choice (by `change_order_line.line_action`):**

| Action | `job_line` (unchanged 2026-06-17) | `job_line_part` (BOM) | `scope_phase` / progress |
|--------|-----------------------------------|------------------------|--------------------------|
| **`add`** | New `job_line` | New BOM explosion — same path as manual line add / win-copy | New `scope_phase` rows seeded same as any new line (37n resolver) |
| **`deduct`** | Target `job_line.status = voided` | Void/cancel associated `job_line_part` rows | Void `scope_phase` rows |
| **`revise`** | Target voided; new replacement `job_line` (`superseded_by_job_line_id`) | Old line's BOM voided; replacement gets a fresh BOM explosion — do not diff-patch old rows | New `scope_phase` rows on replacement; **carry forward `completed_qty`** proportionally from the superseded line's phases (matched by `name` / `sequence`) so a revise never erases real field progress |

**Guardrails (block vs. warn):**

| Condition | Rule |
|-----------|------|
| `deduct` / `revise` target has `job_line_part` rows already `on_purchase_order` / `received` (per procurement rollup) | **Block approve** with a structured conflict — can't un-buy delivered/committed material without a separate procurement decision (return-to-vendor, keep-as-surplus). Approver resolves procurement first, then re-approves the CO. |
| `deduct` / `revise` target has `scope_phase.completed_qty > 0` on any phase | **Warn, don't block** — completed field work stays true. `deduct` still voids the phase, but existing `progress_entry_line` rows are never deleted (audit trail of real work done, even on a line later cut from contract). |

**Rationale:** The 2026-06-17 decision locked the sold-line ledger mechanics but left BOM/procurement and field-progress fallout implicit — building wave 5d without these rules risks orphaned open requisitions (deduct a line that's already been bought) or silently erased field progress (revise a line that's half-installed). Locking this now, before 5d starts, avoids relitigating it mid-implementation.

**Not in scope:** Automatic vendor-return workflow when a `deduct` is blocked on committed material (PM resolves manually via existing procurement Surfaces); CO-level margin-impact UI (see [`costing.md`](./costing.md)).

---

### Decision: estimate + job site anchor — warn-and-clear, not immutable (2026-07-14)

**Status:** **Locked** (task 44). **Canonical detail:** [`estimate.md`](./estimate.md#decision-estimate--job-site-anchor--warn-and-clear-not-immutable-2026-07-14) (**S1–S9**). **Supersedes:** wave-5a rule “`site_id` change only when no `estimate_id` and no `job_line` rows” ([wave 5 amendments](#decision-job-wave-5--implementation-order-2026-06-23)).

**Choice (job-specific):**

| Topic | Choice |
|-------|--------|
| Writable | Same as estimate — `LinkedSelectInput` while Overview/`profile` writable and job not `cancelled` |
| Lines present | Allowed — confirm + clear `line_items` (and any job place FKs) before dirtying; Save persists |
| **`estimate_id` set** | **Site frozen** — read-only + open icon; DAL rejects change (won-estimate anchor) |
| `cancelled` | Entire profile frozen (existing) |
| Stakeholders | Not cleared on site change |

**Rationale:** Operators should not learn different site rules on jobs vs estimates. Link to a won estimate still pins site.

**Task:** [44](../tasks/44-site-anchor-warn-and-clear.md).

---

### Decision: job scope group — implicit General (J4 locked 2026-06-27)

**Choice:** `job_line.job_scope_group_id` **nullable**. DAL/UI expose synthetic **General** group for lines with null FK. Real `job_scope_group` rows when organized by area, phase, SOV, or from `estimate_system` win mapping.

**Rationale:** Small/flat jobs need no extra grouping row; production rollups still work via General bucket.


### Decision: phase templates — per system default + item override (J5 locked 2026-06-27)

**Status:** **Superseded** (2026-07-07) by [labor phase inclusion](./catalog.md#decision-labor-phase-inclusion--catalog--estimate--job-2026-07-07) ([37n](../tasks/37n-labor-phase-inclusion.md)). Job `scope_phase` rows seed from resolved `item_labor_phase` filtered by estimate scope/zone phase inclusion — not `phase_template_step`.

**Choice:** `item.phase_template_id` when set; else `system.default_phase_template_id`; else org fallback. Job line create / win copies `phase_template_step` → `scope_phase`.

**Rationale:** FA vs access vs CCTV need different default install/program/test paths; items can narrow further.


### Decision: progress entry workflow — none in v1 (J2 locked 2026-06-27)

**Choice:** No status on `progress_entry`. Save applies qty to `scope_phase` immediately. PM review for billing stays on `billable_line` — separate concern.

**Rationale:** Ship field progress without an approval surface; add draft/submit later if needed.


### Decision: job scope, progress, and as-built staging (2026-06-27)

**Status:** **Planning** — [`planning/03-jobs-progress.md`](../planning/03-jobs-progress.md). Open forks: [`planning/07-open-decisions.md`](../planning/07-open-decisions.md).

**Choice (target model):**

- **Job = work order v1** — no dispatch WO layer.
- **`job_scope_group`** → **`job_line`** (scope item) → **`scope_phase`** → **`progress_entry`** / **`progress_entry_line`**.
- Fractional completion on **`scope_phase.completed_qty`** — **`job_work_item` dropped** ([J1 locked](../planning/07-open-decisions.md#j1--field-progress-model--locked-2026-06-27)).
- **`job.complete` (v1)** publishes site as-built — no staging table ([as-built publish](#decision-as-built-publish--on-job-complete-no-staging-v1-2026-06-27)).
- **Change order** = contract $; **as-built** = site registry.

**Rationale:** Progress attaches to scope phases so v2 scheduling does not require remodel; site updates are reviewed separately from field reports.


### Decision: job wave 5 — implementation order (2026-06-23)

**Status:** Locked in job planning session (2026-06-23); **amended** spec planning session (2026-06-23). **Spec:** [`job.md`](../surface-specs/job.md) ✅ · **Task:** [`23-job-wave-5a.md`](../tasks/23-job-wave-5a.md).

**Choice:** **Catalog-first (path X)** — shared line-item UI ships after wave **3** (`part` + minimal `item`); estimate 4a line grid is **interim** and will be reworked in **4d′** with the same component used on job Scope, then PO/invoice lines.

#### Locked product answers

| # | Topic | Choice |
|---|--------|--------|
| 1 | **5a scope** | List + **Overview** (profile + stakeholders) live; **Scope / Field / Billing tabs stubbed** in shell |
| 2 | **Line editor** | **Flat** persisted shape when UI ships; grouped-by-place after wave **2b** — same as estimate |
| 3 | **Create** | **Manual** POST (`title` + `site_id`) in **5a**; service/warranty jobs need a front door |
| 4 | **`win` → job** | **5b** — estimate `win`/`lose` + copy after job DAL exists; stub/hidden on estimate until then |
| 5 | **Stakeholders** | **Include in 5a** — `job_party` replace-array; reuse estimate stakeholder pattern |
| 6 | **Field tab** | **Defer** — no `work_items` in YAML; no `job_work_item` DAL in 5a |
| 7 | **Change orders** | **Defer** — separate `change_order_*` surfaces (wave **5d**) |
| 8 | **Billing tab** | **Stubbed** — no billing Fields in 5a YAML; DBML column defaults only |
| 9 | **Save** | **Whole-job** — one Save/Revert toolbar across tabs ([amended tabbed layout](#decision-job_detail-layout--tabbed-2026-06-17)) |
| 10 | **`complete`** | **Defer** — 5a status: `planned` \| `active` \| `cancelled` only; publish geography in **5c** |
| 11 | **Catalog pickers** | **Catalog-first** — no job Scope line UI until wave **3** + shared line editor; do not copy interim estimate grid as target |
| 12 | **5a exit** | CRUD jobs with profile + stakeholders; tabbed shell; DAL/API for `line_items` (win-copy ready); **no Scope line grid** |

#### Spec planning amendments (2026-06-23)

Session locked in [`job.md`](../surface-specs/job.md) — overrides or extends rows above where noted:

| Topic | Choice |
|-------|--------|
| List | `title` + site name only; defer search, sort UI, filters; DAL `title` asc |
| `billing_settings` | Omit from 5a YAML; DB defaults only; Overview section in **6b** |
| `profile` PATCH | `title`, `site_id`, `status`, **`job_kind`**; block all PATCH when `cancelled` |
| `site_id` change | **Amended 2026-07-14** — warn-and-clear; freeze only when `estimate_id` set ([decision](./job.md#decision-estimate--job-site-anchor--warn-and-clear-not-immutable-2026-07-14)); historical: only when no `estimate_id` and no `job_line` rows |
| Delete | Defer 5a — no DELETE route |
| `complete` | Declare in policy YAML; no toolbar handler until **5c** |
| Stakeholders | Add `job_party.sort_order`; standard catalog pickers + suggested relation names in empty state |
| Dev seed | None — `/party-relations` only |
| Cross-nav | Site + estimate links; defer hub engagements and `?site_id=` filter |

#### Wave order (after planning)

| Wave | Deliverable |
|------|-------------|
| **5a** | Job migration + YAML + DAL + API + `/jobs` shell (Overview only) |
| **3** | `part_*`, minimal `item_*` — catalog foundation |
| **3e** | Shared line editor spike + component |
| **4d′** | Retrofit estimate Scope; enable job Scope; same component for PO/invoice later |
| **5b** | Estimate `win` / `lose` + job copy |
| **5c** | Field tab (`work_items`) + `complete` + site geography publish |
| **5d** | Change orders |
| **6b** | Billing tab (`billable_items`, `sov_milestones`) |

**Rationale:** Line items across estimates, jobs, POs, and invoices should anchor on real `item` / `part` pickers and assembly expand — not description-only grids. Job shell still lands early so policy, nav, stakeholders, and win-copy DAL are ready before Scope UI.


### Decision: as-built publish — on job complete, no staging v1 (2026-06-27)

**Status:** Locked (A2). See also [site.md](./site.md#decision-as-built-publish--on-job-complete-no-staging-v1-2026-06-27).

**Choice:** v1 **`complete`** action = site publish (`proposed` → `active`, scope-driven asset creation). **`job_as_built_change` deferred v1.5.**

**Rationale:** Single closeout action; PM review queue when field data quality requires it.


### Decision: field progress — scope phase + progress entries (2026-06-27)

**Status:** Locked. Supersedes [field status — `job_work_item` (2026-06-17)](#decision-field-status--job_work_item-2026-06-17--superseded). Planning: [`07-open-decisions.md`](../planning/07-open-decisions.md#j1--field-progress-model--locked-2026-06-27).

**Choice:** **`scope_phase`** (`planned_qty`, `completed_qty`) + **`progress_entry`** / **`progress_entry_line`**. Drop **`job_work_item`** from DBML — never migrated.

- Progress entry lines sum into `scope_phase.completed_qty` (fractional — e.g. 6 of 10).
- Optional `site_area_id` / `site_asset_id` on entry lines.
- Billing `qty_installed` reads phase rollups — see [billing](../decisions/billing.md).
- History → `latch_audit` on progress mutations.

**Rationale:** One production model; supports qty-based progress and v2 scheduling without remodel.


### Decision: field status — `job_work_item` (2026-06-17) — **superseded**

**Superseded by** [field progress — scope phase + progress entries (2026-06-27)](#decision-field-progress--scope-phase--progress-entries-2026-06-27).


### Decision: change orders — unified `job_line` ledger (2026-06-17)

**Status:** Locked. **Amended 2026-07-14** — [BOM and scope phase reconciliation](#decision-change-order--bom-and-scope-phase-reconciliation-2026-07-14) locks the `job_line_part` / `scope_phase` fallout this decision left implicit.

**Choice:**

- `change_order.estimate_id` optional — CO from quote or entered directly.
- `change_order_line.line_action`: **`add`** | **`deduct`** | **`revise`**; `target_job_line_id` for deduct/revise.
- On **approve:** `add` → new `job_line` with `change_order_line_id`; `deduct` → `job_line.status = voided` + provenance; `revise` → void + replacement line (`superseded_by_job_line_id`).
- CO lines remain immutable; operational scope is always **`job_line`** (`source`: `estimate` | `change_order` | `manual`).

**Rationale:** Additive and deductive amendments with audit trail; avoid negative-qty sold lines.


### Decision: engagements — `job_kind` (2026-06-17)

**Choice:** Single **`job`** table for install projects, service calls, and warranty work.

- `job_kind` CHECK: `project` | `service` | `warranty`
- `parent_job_id` optional — warranty / follow-up to prior job
- Same child tables: lines, parts, work items, change orders, financials

**Rationale:** Service tickets share scope, geography, and field-status machinery with install jobs — no parallel ticket schema in v1.


### Decision: `job_detail` layout — tabbed (2026-06-17)

**Status:** Locked in [task 18](../tasks/18-surface-catalog.md) (O4).

**Choice:** **One** `job_detail` Surface; **tabbed** page layout (Ant Design `Tabs`). Policy and PATCH remain a single Surface — tabs are UI organization only.

| Tab | Fields / content |
|-----|----------------|
| **Overview** | `profile`, `stakeholders`, `billing_settings` |
| **Scope** | `line_items` (+ links to `change_order_*`); procurement **links** to `requested_order_*`, `purchase_order_*`, `material_receipt_*` (separate Surfaces) |
| **Field** | `work_items` |
| **Billing** | `billable_items`, `sov_milestones` (when `billing_model = progress_sov`) — wave 6b; links to `invoice_*` |

**Save:** **Whole-job** — one Save/Revert toolbar; single PATCH for all writable Fields on the form ([wave 5 order](#decision-job-wave-5--implementation-order-2026-06-23)). Tabs are layout only; manifest gates Fields per tab regardless.

**Not in tabs:** Procurement and invoice **documents** stay separate Surfaces; job shows summary counts + deep links.

**Catalog:** [`surfaces.md`](../surfaces.md#job_list--job_detail).


### Decision: job anchor and stakeholders — deferred to job slice (2026-06-15)

**Choice:** `job` (and `job_party`, estimates, lines, `site_section` / `site_location` on site) are **out of Slice 2**. Locked contract for Slice 5:

- `job.site_id` NOT NULL → where work happens
- `job.job_kind` — `project` | `service` | `warranty`; optional `parent_job_id`
- `job_party (job_id, party_id, relation_id)` — `relation_id` FK → **`job_party_relation`** catalog ([schema-first decision](./general.md#decision-schema-first--finish-dbml-before-migrations-2026-06-16)); suggested display names include: `customer`, `property_owner`, `bill_to`, `sold_to`, `general_contractor`, `subcontractor`, `subcontract_through`
- No `customer_id` column on `site` or `job` as the sole counterparty link
- **No `job_location`** — site geography on `site_section` / `site_location` ([site-owned sections and locations](./site.md#decision-site-owned-sections-and-locations--lifecycle-and-history-2026-06-17))

**Rationale:** Site slice establishes place + standing contacts; job slice adds engagement-specific stakeholder flexibility without painting Slice 2 into a single-FK corner.
