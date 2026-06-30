# Jobs, progress, and as-built

> **Status:** Planning (2026-06-27). **J1 locked** — scope phase + progress entries replace `job_work_item`.

### Decision: job scope and progress model (2026-06-27)

**Choice (J1 locked 2026-06-27):**

- **Job = work order v1** — no dispatch work-order layer until v2.
- **Job Scope Group** → **Job Scope Item** (`job_line`) → **Scope Phase** → **Progress Entry** / **Progress Entry Line**.
- Fractional completion on **`scope_phase.completed_qty`**; **`job_work_item` dropped**.
- **Change order** changes contract scope and $; **as-built change** changes site registry.

---

## Job Scope Group

**What it is:** Production organizer on the job — **not** a work order, **not** a `site_area`.

| Field | Purpose |
|-------|---------|
| `job_id`, `name` | |
| `group_type` | `location` \| `trade` \| `system` \| `phase` \| `sov_section` \| `change_order` \| `repair_group` \| `testing_group` \| `closeout_group` \| `general` |
| `trade_id`, `system_id` | Who / what (catalog `system`) |
| `fulfillment_type` | `self` \| `subcontracted` \| `by_others` \| `allowance` \| … |
| `site_system_id`, `site_area_id` | Optional place context |
| `sov_line_id` | Optional default SOV link |

**`group_type` values** (metadata for UI/reports — no separate tables):

| Type | Use |
|------|-----|
| `repair_group` | Cluster of deficiency/repair scope |
| `testing_group` | Acceptance / inspection block |
| `closeout_group` | O&M, manuals, training — not install % |

**J4 locked (2026-06-27):** `job_scope_group_id` **nullable** on `job_line`. UI/DTO shows synthetic **General** when null. Real groups optional (from win / PM setup).

**Win mapping:** `estimate_system` tab or area subtree → scope group(s); flat win → all lines null group_id → General in UI.

---

## Job Scope Item

Sold measurable work — table name likely stays **`job_line`**.

| Field | Notes |
|-------|-------|
| `job_scope_group_id` | Parent group — **nullable** (J4: implicit General in UI) |
| `quantity`, `unit_price`, … | Contract snapshot |
| `site_area_id`, `site_asset_id` | From estimate |
| `item_id`, `part_id` | Catalog |
| `material_status` | Carried from estimate |
| `source` | `estimate` \| `change_order` \| `manual` |

**Change order** (existing decision): `add` / `deduct` / `revise` → mutates `job_line` ledger.

---

## Scope Phase

**Per scope item** — fractional completion lives here (**replaces `job_work_item`** — [J1 locked](./07-open-decisions.md#j1--field-progress-model--locked-2026-06-27)).

| Field | Notes |
|-------|-------|
| `job_scope_item_id` | |
| `phase_template_step_id` | Optional — from catalog |
| `name`, `sequence` | Install, Program, Test, Complete, … |
| `planned_qty`, `completed_qty` | e.g. 6 of 10 |
| `progress_weight`, `billing_weight` | Rollups — see [07-open-decisions.md](./07-open-decisions.md#J3) |
| `requires_previous_phase` | Gate |
| `target_date` | Optional — PM-set install target; feeds PO `order_by` ([04-procurement.md](./04-procurement.md), P2) |

### Phase templates (J5 locked)

| Catalog | Instance |
|---------|----------|
| `phase_template` + `phase_template_step` | Ordered steps + default weights |
| `system.default_phase_template_id` | Per-system fallback |
| `item.phase_template_id` | Item override |
| **`scope_phase`** | Created on job line add or win-copy |

**Estimate:** optional phase preview only. **`scope_phase` rows on job** when line is created or on win.

---

## Progress Entry / Line

| Entity | Role |
|--------|------|
| `progress_entry` | Header — work date, entered_by, crew, notes |
| `progress_entry_line` | `scope_phase_id`, `quantity_completed`, optional `site_area_id` / `site_asset_id` |

Rollups: by job, phase name, scope group, area, trade/system, SOV allocation.

### Field progress (J1 locked)

**`job_work_item` dropped.** Use `progress_entry` + `progress_entry_line` → `scope_phase.completed_qty`.

### Progress approval (J2 locked)

**No workflow v1.** Saved `progress_entry_line` rows roll up immediately. No status column. Billing review stays on `billable_line` — not field progress.

---

## As-built vs change order

| | Change order | Site publish (v1) |
|---|--------------|-------------------|
| Changes | Contract scope + $ | Site areas/assets |
| Table | `change_order_*` | **`job.complete` DAL** — no staging table |
| Example | +5 cameras ($) | Promote proposed areas; create assets from scope |

**During job:**

- Edit **`proposed`** areas/assets freely if scope still matches.
- Do **not** mutate **`active`** site master from routine job PATCH — only on **`complete`** (v1).
- Sold qty/$ change → **CO first**.

### Complete action (A1 + A2 locked)

| Step | v1 |
|------|-----|
| Preconditions | Validation only (no review queue) |
| Publish | `proposed` → `active`; create/update assets per scope + progress |
| Job status | `complete` in same transaction |

**v1.5:** `job_as_built_change` review queue — see [07-open-decisions.md](./07-open-decisions.md#a3--batch-as-built-from-progress--deferred-v15).

---

## `job_detail` tabs (unchanged intent)

| Tab | Content |
|-----|---------|
| Overview | Profile, stakeholders, billing settings |
| Scope | Scope groups/items, CO links, procurement links |
| Field | Progress entries |
| Billing | Billable, SOV |

---

## Related

- [02-estimates.md](./02-estimates.md) — win copy
- [01-site-as-built.md](./01-site-as-built.md) — area/asset
- [05-billing.md](./05-billing.md) — progress → billable
