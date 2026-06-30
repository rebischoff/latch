# Estimates

> **Status:** Planning (2026-06-27). **C2 locked.** Amends [`decisions/estimate.md`](../decisions/estimate.md).

### Decision: quote geography — estimate-owned tree, reconcile at win (2026-06-29)

**Amends** inline `proposed` site writes during estimate Save (see [01-site-as-built.md](./01-site-as-built.md)).

**Choice:**

| Phase | Rule |
|-------|------|
| **While quoting** | Estimate **reads** site `site_system` / `site_area` / `site_asset` for context. **Does not** INSERT/UPDATE site geography on Save. |
| **Quote tree (B)** | **`estimate_area`** only (follow-on DDL, 4c′) — per quote, per `estimate_system`: build quote areas manually **or** **explicit “Import from site”** (copies active `site_area` tree for that catalog `system`). Lines FK `estimate_area_id`. **No `estimate_asset`**. |
| **Win → job (4b)** | **Reconcile** quote areas → `site_area` (map or create **`proposed`**). `job_line.site_area_id` resolved at win. **`site_asset`** on site at install / job complete — not from quote asset rows. |
| **Job complete** | Unchanged (A2): `proposed` → `active` on site. |

**4e ([task 32](../tasks/32-estimate-wave-4e.md)):** `estimate_system` + specs + flat lines only — `estimate_area` DDL deferred to **4c′**.

**No `estimate_asset` (locked 2026-06-29):** Assets exist only on the site (`site_asset`). Quotes place lines on **`estimate_area`**; device identity is on the line (`part_id`, description).

**Import from site (locked 2026-06-29):** Adding a system block does **not** auto-copy site areas. User runs **Import from site** to snapshot active `site_area` rows into `estimate_area`. **V2:** optional prompt when creating/linking a site on a new estimate (“Import geography for selected systems?”).

**Spec panel (locked 2026-06-29, 4e):** Hide spec UI when catalog `system` has no `system_spec_def` rows. Empty state deferred to catalog spec admin (3c+).

---

### Decision: estimate — `estimate_system` tabs, specs, no section v1 (2026-06-27)

**Choice:**

- **`estimate_section` not v1** — subtotals by **`estimate_area`** within each system block (quote tree, 4c′).
- **`estimate_system`** — one row per system block (UI tab); spec knobs **per block**, not one global header.
- **One won estimate → one job** (E3).
- **Geography optional** — flat lines OK; any part/labor/expense allowed on lines. No `location_confidence` column v1 (E4) — UI may warn when lines lack `estimate_area_id`.
- **Multi-system:** supported via multiple `estimate_system` tabs (each with own spec panel + area tree); single-system = one tab.

---

## `estimate_system` (system tabs)

| Column | Notes |
|--------|--------|
| `id` | PK |
| `estimate_id` | |
| `system_id` | FK → catalog **`system`** (Fire alarm, Access, …) |
| `site_system_id` | Nullable — proposed or active instance on quote `site_id` |
| `sort_order` | Tab order |

**UI:** One Ant Design tab per `estimate_system`. Area tree and lines are **scoped to that tab's `site_system_id`** — do not mix FA areas with CCTV areas in one tree.

| Tabs | When |
|------|------|
| 1 | Typical single-system quote |
| 2+ | Whole-building bid (discouraged in copy, supported in schema) |
| 0 + flat lines | ROM / no system (`estimate_system` optional for mobilization-only) |

---

## System specs (C2 locked)

Technical compatibility knobs — **not** `manufacturer_party_id`. See [06-catalog-trade-system.md](./06-catalog-trade-system.md).

### Per tab: `estimate_system_spec`

| Column | Notes |
|--------|--------|
| `estimate_system_id` | FK |
| `system_spec_def_id` | FK → `system_spec_def` (UUID) |
| `system_spec_option_id` | FK for enum defs |
| `value_text` / `value_boolean` | For text/boolean defs |

### Overrides

| Level | Table | Scope |
|-------|-------|--------|
| Tab defaults | `estimate_system_spec` | All lines on this `estimate_system` |
| Per area | `estimate_area_spec` | Lines with quote `estimate_area_id` in this tab's tree (FK target amends when quote geography ships) |
| Per line | `estimate_line_spec` | One line |

**Resolution:** line → area (same `estimate_system`) → `estimate_system_spec`.

**Job after win:** `job_system` block + `job_system_spec` / `job_area_spec` / `job_line_spec` (snapshot).

**Part picker:** `resolveSpecs(estimate_system_id, line)` → filter `manufacturer_part_spec` by `system_spec_def_id` + options.

---

## Estimate line items

Flat `estimate_line` array; UI groups by area within active tab.

| Column | Required | Notes |
|--------|----------|-------|
| `estimate_id` | yes | |
| `estimate_system_id` | optional | FK — which tab; null for non-system lines |
| `line_number`, `sort_order` | yes | |
| `line_kind` | yes | `product` \| `labor` \| `expense` |
| `description`, `quantity`, `unit`, `unit_cost`, `unit_price` | yes | Snapshots |
| `item_id`, `part_id` | optional | |
| `estimate_area_id` | optional | Quote area (4c′ DDL); **4e:** omit or null. At win → resolved `site_area_id` on `job_line` |
| `material_status` | optional | `generic` … `verified` |
| `parent_line_id`, `line_role` | optional | Kits |

**No `estimate_section_id` v1.**

### UI (per system tab)

```
[ Fire Alarm ] [ CCTV ]

Specs: SLC protocol [LiteSpeed ▼]  Color [Red ▼]  …

▼ Floor 1 — East     [Specs override…]
    Line: Pull station  qty 10  …
▼ General
    Line: Mobilization  …
```

---

## Win → job

| From estimate | To job |
|---------------|--------|
| `site_id` | `job.site_id` |
| `estimate_system` blocks | `job_scope_group` (or `job_system` mirror) |
| Lines | `job_line` — commercial snapshots copied; **geography reconciled** (see 2026-06-29 decision above) |
| Quote `estimate_area` | Map → existing `site_area`, or INSERT **`proposed`** `site_area` |
| Spec snapshots | `job_*_spec` tables |

**Reconcile (4b):** sold scope is placed on the site area tree; `job_line.site_area_id` is a **resolved** site id. **`site_asset`** rows are site as-built only — created/updated on install or **`job.complete`**, not from quote-level asset entities.

Site: new **`proposed`** rows may be created at win; **`proposed` → `active`** still on job **`complete`** (A2).

---

## Related

- [06-catalog-trade-system.md](./06-catalog-trade-system.md)
- [01-site-as-built.md](./01-site-as-built.md)
- [03-jobs-progress.md](./03-jobs-progress.md)
