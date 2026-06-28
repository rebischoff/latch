# Estimates

> **Status:** Planning (2026-06-27). Amends [`decisions/estimate.md`](../decisions/estimate.md).

### Decision: estimate — per-system assumptions, no commercial section v1 (2026-06-27)

**Choice:**

- **`estimate_section` not shipped v1** — subtotals and grouping use **`site_area` / `site_asset`** (and flat lines). Revisit commercial sections only if formal CSI/alternate PDF structure is required.
- **Default:** one estimate → one `site_id` + optional **`site_system_id`** (or null = no-system / multi-line system tags).
- **One won estimate → one job** (locked E3). Assumes estimate is single-system or no-system; not a multi-estimate merge in v1.
- **Geography optional** — flat rough quote valid even when site has full as-built.

---

## Per-system assumptions (locked 1.1, E1)

Assumptions are a **set per `site_system`** (catalog + values on the estimate), not a global estimate header when system is null.

### Catalog: `system_assumption_def`

Org-defined knobs per system type, e.g. for Fire Alarm:

| `assumption_key` | Example values | Purpose |
|------------------|----------------|---------|
| `manufacturer` | Notifier, Siemens, … | Narrow compatible parts |
| `system_type` | Addressable, Conventional | Device family |
| `device_color` | Red, White | Aesthetic variants |
| `wire_type` | … | Optional |

Access Control, CCTV, etc. have **their own** assumption defs.

### Estimate: `estimate_system_assumption`

| Column | Notes |
|--------|-------|
| `estimate_id` | |
| `site_system_id` | Nullable — matches estimate's system or default bucket |
| `assumption_key` | FK → def |
| `value` | Text or FK to assumption_option catalog |

**Inheritance:** New estimate lines **inherit** active assumptions for the estimate's system → DAL filters **suggested** `part_id` / `item_id` ([06-catalog-trade-system.md](./06-catalog-trade-system.md)).

**Snapshot on win:** Copy assumption values onto job record so catalog changes do not rewrite closed scope.

### Parts must be taggable (locked 1.2)

For assumptions to narrow suggestions, catalog rows carry **compatible tags**:

| On | Tags (examples) |
|----|-----------------|
| `manufacturer_part` | `manufacturer_party_id`, optional `system_type_tags[]`, `color`, … |
| `item` | Default part + tags for generic sellable skew |

DAL: `suggestParts(assumptions)` = filter/rank by tag match; never auto-pick without user confirm unless `material_status = verified`.

---

## Estimate line items — shape

Persisted model stays a **flat** `estimate_line` array (same pattern as current DBML). UI may group by area tree without extra tables.

### Core columns

| Column | Required | Notes |
|--------|----------|-------|
| `estimate_id` | yes | |
| `line_number`, `sort_order` | yes | |
| `line_kind` | yes | `product` \| `labor` \| `expense` |
| `description` | yes | Snapshot text |
| `quantity`, `unit` | yes | |
| `unit_cost`, `unit_price` | yes | Snapshot at save |
| `item_id` | optional | Catalog work item |
| `part_id` | optional | Specific MPN when verified |
| `site_system_id` | optional | When estimate is multi-system (discouraged) |
| `site_area_id` | optional | Where work applies — `proposed` or `active` |
| `site_asset_id` | optional | Service/replace one device |
| `material_status` | optional | `generic` \| `assumed` \| `suggested` \| `verified` \| `customer_supplied` \| `by_others` |
| `parent_line_id`, `line_role` | optional | Kits: `kit_header` / `kit_component` |

**No `estimate_section_id` v1.**

### UI grouping (presentation only)

| Row kind | Source |
|----------|--------|
| **Area parent** | `site_area` — expand/collapse; subtotal per area |
| **Asset parent** | Single-device lines under existing `site_asset` |
| **General** | Lines with null area |
| **Line** | Full inline editors |

Subtotals roll up by **area tree** and by **system** — replaces commercial `estimate_section` for v1.

### Estimate shapes

| Shape | System | Areas | Use |
|-------|--------|-------|-----|
| **Quick** | optional | none | ROM, T&M, service with asset FK only |
| **Standard** | set | area + qty | Typical install quote |
| **Asset-specific** | set | asset FK | Replace SD-101, repair |

### Geography rules

- Lines may FK **existing** `active` areas/assets.
- Lines may cause creation of **`proposed`** areas (DAL on save) — no prior `site_detail` setup required.
- Estimate does **not** mutate **`active`** site master (no delete/move on save).
- Flat quote allowed when site already has full tree.

### `location_confidence` (optional product field — see [07-open-decisions.md](./07-open-decisions.md#E4))

Not required for v1 schema. If added: `none` \| `rough` \| `by_area` \| `by_asset` — UI warnings only.

---

## Win → job

| From estimate | To job |
|---------------|--------|
| `site_id` | `job.site_id` |
| Lines | `job_scope_item` (`job_line`) |
| `site_area_id` / `site_asset_id` | Same FKs on scope items |
| Assumptions snapshot | Job header / `job_system_assumption` |
| (no sections v1) | `job_scope_group` from area groupings or implicit General |

Site rows: **`proposed` stay proposed** on win.

---

## Related

- Site model: [01-site-as-built.md](./01-site-as-built.md)
- Job scope: [03-jobs-progress.md](./03-jobs-progress.md)
- Catalog tags: [06-catalog-trade-system.md](./06-catalog-trade-system.md)
